/**
 * POST /api/audience
 *
 * Analyzes which communities a social handle's audience is most active in.
 * Uses Apify scrapers when APIFY_API_TOKEN is set; falls back to mock.
 *
 * Body:
 *   {
 *     handles: { default: string; twitter?: string; instagram?: string; ... },
 *     platform: AudiencePlatform
 *   }
 *
 * Response:
 *   AudienceResult
 */

import { NextRequest, NextResponse } from "next/server";
import { canRunBrandAudit } from "@/lib/plans";
import { countBrandAudits, getUserPlan } from "@/lib/plan-usage";
import { z } from "zod";
import { requireSession, enforceRateLimit, badRequest, serverError, paymentRequired } from "@/lib/api-helpers";
import { getMockAudience } from "@/lib/platforms/audience";
import { getLiveAudience } from "@/lib/platforms/audience-live";

// Allow up to 90s on Vercel Pro — Apify scraping can take 30–60s
export const maxDuration = 90;

const handleField = z.string().min(1).max(100).trim();
const scrapeablePlatform = z.enum(["twitter", "instagram", "tiktok", "reddit", "youtube", "pinterest"]);

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
  platform: z.enum(["all", "reddit", "twitter", "tiktok", "instagram", "youtube", "pinterest", "facebook", "substack"]),
  excludedPlatforms: z.array(scrapeablePlatform).optional().default([]),
});

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const rateLimitError = await enforceRateLimit(req, session.user.id, "audience", 20);
  if (rateLimitError) return rateLimitError;

  // ── Plan: Audience runs alongside a Brand Audit, so it shares that allowance.
  // The audit is logged when it finishes, so this check sees the same count.
  const plan = await getUserPlan(session.user.id, session.user.email);
  if (!plan) return serverError("User not found.");
  if (!canRunBrandAudit(plan, await countBrandAudits(session.user.id, plan))) {
    return paymentRequired("Brand Audits are included on Pro and above. Upgrade to run another audit.");
  }

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
  const useApify = !!process.env.APIFY_API_TOKEN && process.env.FORCE_MOCK_DATA !== "true";
  const defaultHandle = handles.default.replace(/^[@u\/]+/, "").toLowerCase();

  try {
    const result = useApify
      ? await getLiveAudience(handles, platform, excludedPlatforms)
      : getMockAudience(defaultHandle, platform);

    return NextResponse.json({ ...result, live: useApify });
  } catch (err) {
    console.error("[api/audience] Live fetch failed, falling back to mock:", err);
    const fallback = getMockAudience(defaultHandle, platform);
    return NextResponse.json({ ...fallback, live: false, fallback: true });
  }
}
