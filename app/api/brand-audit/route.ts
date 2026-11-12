/**
 * POST /api/brand-audit
 *
 * Analyzes a brand's social audience and returns a subculture audit.
 *
 * Body:
 *   {
 *     handles: { default: string; twitter?: string; instagram?: string; tiktok?: string; reddit?: string; youtube?: string; pinterest?: string },
 *     platform?: "all" | "twitter" | "instagram" | "tiktok" | "reddit" | "youtube" | "pinterest"
 *   }
 *
 * Response:
 *   BrandAuditResult
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, enforceRateLimit, badRequest, serverError, paymentRequired } from "@/lib/api-helpers";
import { canRunBrandAudit, getPlan } from "@/lib/plans";
import { countBrandAudits, getUserPlan } from "@/lib/plan-usage";
import { runBrandAudit } from "@/lib/brand-audit";
import { prisma } from "@/lib/prisma";
import type { DiscoveredSubculture } from "@/lib/types/brand-audit";

// Allow up to 120s — Apify scraping (45s) + Claude analysis (30s) + buffer
export const maxDuration = 120;

const handleField = z.string().min(1).max(100).trim();

const platformEnum = z.enum(["twitter", "instagram", "tiktok", "reddit", "youtube", "pinterest"]);

const bodySchema = z.object({
  handles: z.object({
    default: handleField,
    twitter: handleField.optional(),
    instagram: handleField.optional(),
    tiktok: handleField.optional(),
    reddit: handleField.optional(),
    youtube: handleField.optional(),
    pinterest: handleField.optional(),
  }),
  platform: z.enum(["all", "twitter", "instagram", "tiktok", "reddit", "youtube", "pinterest"]).default("all"),
  excludedPlatforms: z.array(platformEnum).optional().default([]),
});

/**
 * GET /api/brand-audit
 *   - no params     → most recent result (for page restore on mount)
 *   - ?history=1    → last 10 runs (metadata only: id, handle, platform, createdAt)
 *   - ?id=<logId>   → full result for a specific past run
 */
export async function GET(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const history = searchParams.get("history");
  const id = searchParams.get("id");

  if (history === "1") {
    const logs = await prisma.auditLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, handle: true, platform: true, createdAt: true },
    });
    return NextResponse.json({ logs });
  }

  if (id) {
    const log = await prisma.auditLog.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, handle: true, platform: true, result: true, createdAt: true },
    });
    if (!log) return new NextResponse(null, { status: 404 });
    return NextResponse.json({ id: log.id, handle: log.handle, platform: log.platform, result: log.result, createdAt: log.createdAt });
  }

  const log = await prisma.auditLog.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, handle: true, platform: true, result: true, createdAt: true },
  });

  if (!log) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ id: log.id, handle: log.handle, platform: log.platform, result: log.result, createdAt: log.createdAt });
}

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const rateLimitError = await enforceRateLimit(req, session.user.id, "brand-audit", 10);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request body.", parsed.error.flatten());
  }

  const { handles, platform, excludedPlatforms } = parsed.data;

  try {
    const plan = await getUserPlan(session.user.id, session.user.email);
    if (!plan) return serverError("User not found.");
    const used = await countBrandAudits(session.user.id, plan);
    if (!canRunBrandAudit(plan, used)) {
      const { limits, name } = getPlan(plan);
      return paymentRequired(
        limits.brandAuditPeriod === "lifetime"
          ? "You've used your trial Brand Audit. Brand Audits are included on Pro and above."
          : `You've used all ${limits.brandAudits} Brand Audits on your ${name} plan this month. Upgrade to Studio for unlimited audits.`
      );
    }

    const result = await runBrandAudit(handles, platform, excludedPlatforms);

    // Fire-and-forget: save history + auto-add discovered subcultures as drafts
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        handle: handles.default,
        platform,
        result: result as object,
      },
    }).catch((e) => console.error("[api/brand-audit] Failed to save audit log:", e));

    if (result.discovered_subcultures?.length) {
      autoAddDiscoveredSubcultures(result.discovered_subcultures).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/brand-audit] Unhandled error:", err);
    return serverError("Brand audit failed. Please try again.");
  }
}

// ─── Auto-add discovered subcultures to library as drafts ─────────────────────

async function autoAddDiscoveredSubcultures(discovered: DiscoveredSubculture[]) {
  for (const sub of discovered) {
    // Skip if a subculture with this name already exists
    const existing = await prisma.subculture.findFirst({
      where: { name: { equals: sub.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) continue;

    // Build a unique slug from the provisional slug
    const baseSlug = (sub.provisional_slug || sub.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    for (let attempt = 1; attempt <= 10; attempt++) {
      const taken = await prisma.subculture.findUnique({ where: { slug }, select: { id: true } });
      if (!taken) break;
      slug = `${baseSlug}-${attempt}`;
    }

    try {
      await prisma.subculture.create({
        data: {
          slug,
          name: sub.name,
          description: sub.description,
          category: sub.suggested_category || "Other",
          status: "draft",
          keywords: sub.key_signals ?? [],
          vernacular: [],
          categoricalBehaviors: [],
          moments: [],
          mediaSources: [],
          icons: [],
          platforms: [],
          psychographics: { hero: "", villain: "", core_values: [], motivations: [] },
          adjacentSubcultures: [],
          brandFitSignals: { fit_industries: [], red_flags: [] },
          generatedByAi: true,
        },
      });
      console.log(`[api/brand-audit] Auto-added draft subculture: ${sub.name}`);
    } catch {
      // Silently skip on duplicate slug race conditions
    }
  }
}
