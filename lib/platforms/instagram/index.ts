/**
 * Instagram platform module.
 * Only returns real data when INSTAGRAM_ACCESS_TOKEN is set (Meta approval required).
 * Returns empty results when not configured — no mock fallback.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { liveInstagramSearch, liveGetInstagramCommunity } from "./live";

export const instagramModule: PlatformModule = {
  platform: "instagram",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (!isPlatformLive("instagram")) return { communities: [], isLive: false };
    return liveInstagramSearch(input.query);
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (!isPlatformLive("instagram")) return null;
    return liveGetInstagramCommunity(communityId);
  },
};
