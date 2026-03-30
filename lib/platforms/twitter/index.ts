/**
 * Twitter/X platform module.
 * Only returns real data when TWITTER_BEARER_TOKEN is set AND the API tier
 * supports search (Basic plan or higher — $100/month).
 * Returns empty results when not configured — no mock fallback.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { liveTwitterSearch, liveGetTwitterCommunity } from "./live";

export const twitterModule: PlatformModule = {
  platform: "twitter",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (!isPlatformLive("twitter")) return { communities: [], isLive: false };
    return liveTwitterSearch(input.query);
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (!isPlatformLive("twitter")) return null;
    return liveGetTwitterCommunity(communityId);
  },
};
