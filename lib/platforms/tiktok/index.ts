/**
 * TikTok platform module.
 * Live via Apify scraper when APIFY_API_TOKEN is set — no TikTok API approval needed.
 * Returns empty results when not configured — no mock fallback.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { liveTikTokSearch, liveGetTikTokCommunity } from "./live";

export const tiktokModule: PlatformModule = {
  platform: "tiktok",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (!isPlatformLive("tiktok")) return { communities: [], isLive: false };
    try {
      return await liveTikTokSearch(input.query);
    } catch (err) {
      console.warn("[tiktok] Live fetch failed:", err);
      return { communities: [], isLive: false };
    }
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (!isPlatformLive("tiktok")) return null;
    try {
      return await liveGetTikTokCommunity(communityId);
    } catch (err) {
      console.warn("[tiktok] Live getCommunity failed:", err);
      return null;
    }
  },
};
