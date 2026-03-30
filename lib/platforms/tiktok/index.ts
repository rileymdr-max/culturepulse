/**
 * TikTok platform module.
 * Currently always uses mock data (Research API requires institutional approval).
 * See lib/platforms/tiktok/live.ts for instructions on connecting the real API.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { mockTikTokSearch, mockGetTikTokCommunity } from "./mock";
import { liveTikTokSearch, liveGetTikTokCommunity } from "./live";

export const tiktokModule: PlatformModule = {
  platform: "tiktok",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (isPlatformLive("tiktok")) {
      try {
        return await liveTikTokSearch(input.query);
      } catch (err) {
        console.warn("[tiktok] Live fetch failed, falling back to mock:", err);
      }
    }
    return mockTikTokSearch(input.query);
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (isPlatformLive("tiktok")) {
      try {
        return await liveGetTikTokCommunity(communityId);
      } catch (err) {
        console.warn("[tiktok] Live getCommunity failed, falling back to mock:", err);
      }
    }
    return mockGetTikTokCommunity(communityId);
  },
};
