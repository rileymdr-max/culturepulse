/**
 * POST /api/search
 *
 * Accepts a search query and optional platform filter list.
 * Runs platform fetchers in parallel and returns unified community results.
 *
 * Body:
 *   { query: string, platforms?: string[] }
 *
 * Response:
 *   { communities: CommunityData[], sources: Record<string, boolean>, query: string }
 */

import { NextRequest, NextResponse } from "next/server";

// Allow up to 5 minutes — required for Apify actors (Vercel Pro / Enterprise only)
export const maxDuration = 300;
import { z } from "zod";
import { requireSession, enforceRateLimit, badRequest, serverError } from "@/lib/api-helpers";
import { searchPlatforms, PLATFORM_NAMES, getPlatformStatuses, type Platform } from "@/lib/platforms";

const searchSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  platforms: z
    .array(z.enum(["reddit", "twitter", "substack", "tiktok", "instagram", "facebook"]))
    .min(1)
    .max(6)
    .optional(),
});

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  // ── Rate limit: 30 searches / minute ──────────────────────────────────────
  const rateLimitError = await enforceRateLimit(req, session.user.id, "search", 30);
  if (rateLimitError) return rateLimitError;

  // ── Validate input ────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request body.", parsed.error.flatten());
  }

  const { query, platforms } = parsed.data;
  const selectedPlatforms = (platforms ?? PLATFORM_NAMES) as Platform[];

  // ── Fetch ─────────────────────────────────────────────────────────────────
  try {
    const { communities, sources } = await searchPlatforms(query, selectedPlatforms);

    return NextResponse.json({
      query,
      communities,
      sources,
      total: communities.length,
      platformStatuses: getPlatformStatuses(),
    });
  } catch (err) {
    console.error("[api/search]", err);
    return serverError();
  }
}
