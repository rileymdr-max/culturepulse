/**
 * GET /api/community/:id
 *
 * Returns full CommunityData for a single community.
 * Checks the DB cache first; fetches live if cache is stale or missing.
 *
 * The :id param is the community_id string (URL-encoded), e.g.:
 *   reddit_r%2FwallStreetBets   →   reddit_r/wallStreetBets
 *   twitter_wallstreetbets
 *
 * Response:
 *   { community: CommunityData, cached: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, enforceRateLimit, notFound, serverError } from "@/lib/api-helpers";
import { getCommunity, type CommunityData } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

/** Cache TTL: 10 minutes */
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  // ── Rate limit: 60 lookups / minute ──────────────────────────────────────
  const rateLimitError = await enforceRateLimit(req, session.user.id, "community", 60);
  if (rateLimitError) return rateLimitError;

  const communityId = decodeURIComponent(params.id);
  if (!communityId) return notFound("Community ID is required.");

  // ── Cache lookup ──────────────────────────────────────────────────────────
  try {
    const [platformPrefix] = communityId.split("_");
    const cached = await prisma.communityCache.findUnique({
      where: { platform_communityId: { platform: platformPrefix, communityId } },
    });

    if (cached && cached.expiresAt > new Date()) {
      return NextResponse.json({
        community: cached.data as CommunityData,
        cached: true,
      });
    }

    // ── Live fetch ────────────────────────────────────────────────────────
    const community = await getCommunity(communityId);
    if (!community) return notFound(`Community "${communityId}" not found.`);

    // ── Write-through cache ───────────────────────────────────────────────
    await prisma.communityCache.upsert({
      where: { platform_communityId: { platform: community.platform, communityId } },
      create: {
        platform: community.platform,
        communityId,
        communityName: community.community_name,
        data: community as object,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
      update: {
        communityName: community.community_name,
        data: community as object,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
    });

    return NextResponse.json({ community, cached: false });
  } catch (err) {
    console.error("[api/community]", err);
    return serverError();
  }
}
