/**
 * Substack platform module.
 * Always attempts live data via public RSS — no API key needed.
 * Returns empty results on failure — no mock fallback.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { liveSubstackSearch, liveGetSubstackCommunity } from "./live";

export const substackModule: PlatformModule = {
  platform: "substack",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    try {
      return await liveSubstackSearch(input.query);
    } catch (err) {
      console.warn("[substack] Live fetch failed:", err);
      return { communities: [], isLive: false };
    }
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    try {
      return await liveGetSubstackCommunity(communityId);
    } catch (err) {
      console.warn("[substack] Live getCommunity failed:", err);
      return null;
    }
  },
};
