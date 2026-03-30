/**
 * Platform orchestrator.
 *
 * This is the single entry point for all data fetching.
 * API routes import from here — never directly from individual platform modules.
 *
 * Usage:
 *   import { searchPlatforms, getCommunity } from "@/lib/platforms";
 */

import type { CommunityData, PlatformModule, PlatformSearchResult } from "./types";
import { redditModule } from "./reddit";
import { twitterModule } from "./twitter";
import { substackModule } from "./substack";
import { tiktokModule } from "./tiktok";
import { instagramModule } from "./instagram";
import { facebookModule } from "./facebook";
import { isPlatformLive } from "@/lib/env";

export type { CommunityData, PlatformSearchResult } from "./types";

// ─── Platform status ──────────────────────────────────────────────────────────

export type PlatformStatus = {
  platform: Platform;
  live: boolean;
  label: string;
  reason?: string; // shown when not live
};

export function getPlatformStatuses(): PlatformStatus[] {
  return [
    {
      platform: "tiktok",
      live: isPlatformLive("tiktok"),
      label: "TikTok",
      reason: "Add APIFY_API_TOKEN to enable",
    },
    {
      platform: "substack",
      live: true,
      label: "Substack",
    },
    {
      platform: "reddit",
      live: isPlatformLive("reddit"),
      label: "Reddit",
      reason: "Waiting on Reddit app approval",
    },
    {
      platform: "twitter",
      live: isPlatformLive("twitter"),
      label: "X / Twitter",
      reason: "Requires Basic API plan ($100/mo)",
    },
    {
      platform: "instagram",
      live: isPlatformLive("instagram"),
      label: "Instagram",
      reason: "Waiting on Meta app approval",
    },
    {
      platform: "facebook",
      live: isPlatformLive("facebook"),
      label: "Facebook",
      reason: "Waiting on Meta app approval",
    },
  ];
}

// ─── Platform registry ────────────────────────────────────────────────────────

const ALL_PLATFORMS: Record<string, PlatformModule> = {
  reddit: redditModule,
  twitter: twitterModule,
  substack: substackModule,
  tiktok: tiktokModule,
  instagram: instagramModule,
  facebook: facebookModule,
};

export const PLATFORM_NAMES = Object.keys(ALL_PLATFORMS) as Platform[];
export type Platform = "reddit" | "twitter" | "substack" | "tiktok" | "instagram" | "facebook";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Searches across the specified platforms (or all platforms if none specified).
 * Runs all platform fetches in parallel and merges results.
 *
 * @param query      - Free-text search term
 * @param platforms  - Subset of platforms to query (default: all)
 * @returns          - Merged, de-duped community results with source metadata
 */
export async function searchPlatforms(
  query: string,
  platforms: Platform[] = PLATFORM_NAMES
): Promise<{ communities: CommunityData[]; sources: Record<string, boolean> }> {
  const results = await Promise.allSettled(
    platforms.map(async (name) => {
      const mod = ALL_PLATFORMS[name];
      if (!mod) return { platform: name, communities: [], isLive: false };
      const result = await mod.search({ query });
      return { platform: name, ...result };
    })
  );

  const communities: CommunityData[] = [];
  const sources: Record<string, boolean> = {};

  for (const result of results) {
    if (result.status === "fulfilled") {
      communities.push(...result.value.communities);
      sources[result.value.platform] = result.value.isLive;
    } else {
      console.error("[platforms] Search failed for a platform:", result.reason);
    }
  }

  return { communities, sources };
}

/**
 * Fetches full community detail for a single community by its ID.
 * The platform is inferred from the ID prefix (e.g. "reddit_r/...", "twitter_...").
 *
 * @param communityId - Unique community ID (includes platform prefix)
 * @returns           - Full CommunityData or null if not found
 */
export async function getCommunity(communityId: string): Promise<CommunityData | null> {
  const platform = inferPlatform(communityId);
  if (!platform) {
    console.error(`[platforms] Cannot infer platform from ID: ${communityId}`);
    return null;
  }
  const mod = ALL_PLATFORMS[platform];
  return mod.getCommunity(communityId);
}

/**
 * Fetches multiple communities in parallel (for the compare view).
 * Returns results in the same order as the input IDs.
 * Null entries indicate a failed or not-found community.
 *
 * @param communityIds - Array of 2-4 community IDs
 */
export async function getCommunitiesForComparison(
  communityIds: string[]
): Promise<(CommunityData | null)[]> {
  return Promise.all(communityIds.map((id) => getCommunity(id)));
}

/**
 * Returns globally trending communities across all platforms.
 * Each platform contributes its top result for a set of evergreen queries.
 */
export async function getGlobalTrending(): Promise<CommunityData[]> {
  const trendingQueries = ["ai", "fitness", "gaming", "fashion", "finance"];
  const allResults = await Promise.allSettled(
    trendingQueries.map((q) => searchPlatforms(q))
  );

  const communities: CommunityData[] = [];
  for (const result of allResults) {
    if (result.status === "fulfilled") {
      // Take the top result from each query
      if (result.value.communities[0]) {
        communities.push(result.value.communities[0]);
      }
    }
  }

  // Sort by community size descending
  return communities.sort((a, b) => b.community_size - a.community_size).slice(0, 12);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Infers the platform name from a community ID prefix. */
function inferPlatform(communityId: string): Platform | null {
  for (const name of PLATFORM_NAMES) {
    if (communityId.startsWith(`${name}_`)) return name;
  }
  return null;
}
