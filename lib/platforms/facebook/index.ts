/**
 * Facebook platform module.
 * Routes to live Graph API or mock based on env configuration.
 * See lib/platforms/facebook/live.ts for API setup instructions.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { mockFacebookSearch, mockGetFacebookCommunity } from "./mock";
import { liveFacebookSearch, liveGetFacebookCommunity } from "./live";

export const facebookModule: PlatformModule = {
  platform: "facebook",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (isPlatformLive("facebook")) {
      try {
        return await liveFacebookSearch(input.query);
      } catch (err) {
        console.warn("[facebook] Live fetch failed, falling back to mock:", err);
      }
    }
    return mockFacebookSearch(input.query);
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (isPlatformLive("facebook")) {
      try {
        return await liveGetFacebookCommunity(communityId);
      } catch (err) {
        console.warn("[facebook] Live getCommunity failed, falling back to mock:", err);
      }
    }
    return mockGetFacebookCommunity(communityId);
  },
};
