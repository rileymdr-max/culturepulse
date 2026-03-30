/**
 * Twitter/X platform module.
 * Routes to live API or mock based on env configuration.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { mockTwitterSearch, mockGetTwitterCommunity } from "./mock";
import { liveTwitterSearch, liveGetTwitterCommunity } from "./live";

export const twitterModule: PlatformModule = {
  platform: "twitter",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (isPlatformLive("twitter")) {
      try {
        return await liveTwitterSearch(input.query);
      } catch (err) {
        console.warn("[twitter] Live fetch failed, falling back to mock:", err);
      }
    }
    return mockTwitterSearch(input.query);
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (isPlatformLive("twitter")) {
      try {
        return await liveGetTwitterCommunity(communityId);
      } catch (err) {
        console.warn("[twitter] Live getCommunity failed, falling back to mock:", err);
      }
    }
    return mockGetTwitterCommunity(communityId);
  },
};
