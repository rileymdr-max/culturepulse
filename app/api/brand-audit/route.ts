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

/** GET /api/brand-audit — returns the user's most recent saved audit result, or 204. */
export async function GET(_req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const log = await prisma.auditLog.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { handle: true, platform: true, result: true, createdAt: true },
  });

  if (!log) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ handle: log.handle, platform: log.platform, result: log.result, createdAt: log.createdAt });
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

    // Fire-and-forget: save audit to history (don't block the response)
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        handle: handles.default,
        platform,
        result: result as object,
      },
    }).catch((e) => console.error("[api/brand-audit] Failed to save audit log:", e));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/brand-audit] Unhandled error:", err);
    return serverError("Brand audit failed. Please try again.");
  }
}
