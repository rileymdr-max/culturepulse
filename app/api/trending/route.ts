/**
 * GET /api/trending
 *
 * Returns globally trending communities across all platforms.
 * Results are sorted by community size (descending).
 *
 * Optional query params:
 *   ?limit=12      — number of results (default 12, max 30)
 *   ?platform=reddit  — filter to a single platform
 *
 * Response:
 *   { communities: CommunityData[], generatedAt: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, enforceRateLimit, badRequest, serverError } from "@/lib/api-helpers";
import { getGlobalTrending, searchPlatforms, PLATFORM_NAMES, type Platform } from "@/lib/platforms";

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  // ── Rate limit: 30 requests / minute ─────────────────────────────────────
  const rateLimitError = await enforceRateLimit(req, session.user.id, "trending", 30);
  if (rateLimitError) return rateLimitError;

  // ── Parse query params ────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const platformParam = searchParams.get("platform");

  const limit = Math.min(30, Math.max(1, parseInt(limitParam ?? "12", 10) || 12));

  if (platformParam && !(PLATFORM_NAMES as string[]).includes(platformParam)) {
    return badRequest(`Unknown platform "${platformParam}". Valid values: ${PLATFORM_NAMES.join(", ")}`);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  try {
    let communities;

    if (platformParam) {
      // Platform-specific trending — run several evergreen queries on that platform
      const queries = ["trending", "viral", "popular", "rising", "community"];
      const results = await Promise.allSettled(
        queries.map((q) => searchPlatforms(q, [platformParam as Platform]))
      );
      const all = results
        .flatMap((r) => (r.status === "fulfilled" ? r.value.communities : []))
        .sort((a, b) => b.community_size - a.community_size);

      // De-dupe by community_id
      const seen = new Set<string>();
      communities = all.filter((c) => {
        if (seen.has(c.community_id)) return false;
        seen.add(c.community_id);
        return true;
      });
    } else {
      communities = await getGlobalTrending();
    }

    return NextResponse.json({
      communities: communities.slice(0, limit),
      total: communities.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/trending]", err);
    return serverError();
  }
}
