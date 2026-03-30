/**
 * Reddit platform module.
 * Only returns real data when REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET are set.
 * Returns empty results when not configured — no mock fallback.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { liveRedditSearch, liveGetRedditCommunity } from "./live";

export const redditModule: PlatformModule = {
  platform: "reddit",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (!isPlatformLive("reddit")) return { communities: [], isLive: false };
    return liveRedditSearch(input.query);
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (!isPlatformLive("reddit")) return null;
    return liveGetRedditCommunity(communityId);
  },
};
