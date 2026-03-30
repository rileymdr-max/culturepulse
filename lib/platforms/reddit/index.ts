/**
 * Reddit platform module.
 * Automatically routes to live API or mock based on env configuration.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { mockRedditSearch, mockGetRedditCommunity } from "./mock";
import { liveRedditSearch, liveGetRedditCommunity } from "./live";

export const redditModule: PlatformModule = {
  platform: "reddit",

  /**
   * Search for subreddits matching the query.
   * Falls back to mock data if Reddit credentials are not configured.
   */
  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (isPlatformLive("reddit")) {
      try {
        return await liveRedditSearch(input.query);
      } catch (err) {
        console.warn("[reddit] Live fetch failed, falling back to mock:", err);
      }
    }
    return mockRedditSearch(input.query);
  },

  /**
   * Fetch full data for a single Reddit community.
   * @param communityId - Format: "reddit_r/subredditName"
   */
  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (isPlatformLive("reddit")) {
      try {
        return await liveGetRedditCommunity(communityId);
      } catch (err) {
        console.warn("[reddit] Live getCommunity failed, falling back to mock:", err);
      }
    }
    return mockGetRedditCommunity(communityId);
  },
};
