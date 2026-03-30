/**
 * Substack platform module.
 * Always attempts live data (RSS requires no API key).
 * Falls back to mock if scraping fails.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { mockSubstackSearch, mockGetSubstackCommunity } from "./mock";
import { liveSubstackSearch, liveGetSubstackCommunity } from "./live";

export const substackModule: PlatformModule = {
  platform: "substack",

  /**
   * Substack uses public RSS — no API key needed.
   * Always tries live first; mock is the fallback.
   */
  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    try {
      return await liveSubstackSearch(input.query);
    } catch (err) {
      console.warn("[substack] Live fetch failed, falling back to mock:", err);
      return mockSubstackSearch(input.query);
    }
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    try {
      return await liveGetSubstackCommunity(communityId);
    } catch (err) {
      console.warn("[substack] Live getCommunity failed, falling back to mock:", err);
      return mockGetSubstackCommunity(communityId);
    }
  },
};
