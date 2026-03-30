/**
 * POST /api/audience
 *
 * Analyzes which communities a social handle's audience is most active in.
 * Uses Apify Twitter scraper when APIFY_API_TOKEN is set; falls back to mock.
 *
 * Body:
 *   { handle: string, platform: AudiencePlatform }
 *
 * Response:
 *   AudienceResult
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, enforceRateLimit, badRequest, serverError } from "@/lib/api-helpers";
import { getMockAudience } from "@/lib/platforms/audience";
import { getLiveAudience } from "@/lib/platforms/audience-live";

// Allow up to 90s on Vercel Pro — Apify scraping can take 30–60s
export const maxDuration = 90;

const bodySchema = z.object({
  handle: z.string().min(1).max(100).trim(),
  platform: z.enum(["all", "reddit", "twitter", "tiktok", "instagram", "facebook", "substack"]),
});

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const rateLimitError = await enforceRateLimit(req, session.user.id, "audience", 20);
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
  const useApify = !!process.env.APIFY_API_TOKEN && !process.env.FORCE_MOCK_DATA;

  try {
    const result = useApify
      ? await getLiveAudience(handle, platform)
      : getMockAudience(handle, platform);

    return NextResponse.json({ ...result, live: useApify });
  } catch (err) {
    console.error("[api/audience] Live fetch failed, falling back to mock:", err);
    // Graceful degradation — always return something usable
    const fallback = getMockAudience(handle, platform);
    return NextResponse.json({ ...fallback, live: false, fallback: true });
  }
}
