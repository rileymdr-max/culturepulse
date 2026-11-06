/**
 * POST /api/brand-audit
 *
 * Analyzes a brand's social audience and returns a subculture audit:
 *   - Matched subcultures from the existing library
 *   - Newly discovered subcultures not yet in any profile
 *
 * Body:
 *   { handle: string, platform?: "all" | "twitter" | "instagram" | "tiktok" | "reddit" | "youtube" | "pinterest" }
 *
 * Response:
 *   BrandAuditResult
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, enforceRateLimit, badRequest, serverError } from "@/lib/api-helpers";
import { runBrandAudit } from "@/lib/brand-audit";

// Allow up to 120s — Apify scraping (45s) + Claude analysis (30s) + buffer
export const maxDuration = 120;

const bodySchema = z.object({
  handle: z.string().min(1).max(100).trim(),
  platform: z.enum(["all", "twitter", "instagram", "tiktok", "reddit", "youtube", "pinterest"]).default("all"),
});

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

  const { handle, platform } = parsed.data;

  try {
    const result = await runBrandAudit(handle, platform);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/brand-audit] Unhandled error:", err);
    return serverError("Brand audit failed. Please try again.");
  }
}
