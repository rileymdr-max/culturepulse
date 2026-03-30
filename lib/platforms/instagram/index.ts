/**
 * Instagram platform module.
 * Routes to live Graph API or mock based on env configuration.
 * See lib/platforms/instagram/live.ts for API setup instructions.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { mockInstagramSearch, mockGetInstagramCommunity } from "./mock";
import { liveInstagramSearch, liveGetInstagramCommunity } from "./live";

export const instagramModule: PlatformModule = {
  platform: "instagram",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (isPlatformLive("instagram")) {
      try {
        return await liveInstagramSearch(input.query);
      } catch (err) {
        console.warn("[instagram] Live fetch failed, falling back to mock:", err);
      }
    }
    return mockInstagramSearch(input.query);
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (isPlatformLive("instagram")) {
      try {
        return await liveGetInstagramCommunity(communityId);
      } catch (err) {
        console.warn("[instagram] Live getCommunity failed, falling back to mock:", err);
      }
    }
    return mockGetInstagramCommunity(communityId);
  },
};
