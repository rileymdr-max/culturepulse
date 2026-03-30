/**
 * Facebook platform module.
 * Only returns real data when FACEBOOK_ACCESS_TOKEN is set (Meta approval required).
 * Returns empty results when not configured — no mock fallback.
 */

import type { CommunityData, PlatformModule, PlatformSearchInput, PlatformSearchResult } from "../types";
import { isPlatformLive } from "@/lib/env";
import { liveFacebookSearch, liveGetFacebookCommunity } from "./live";

export const facebookModule: PlatformModule = {
  platform: "facebook",

  async search(input: PlatformSearchInput): Promise<PlatformSearchResult> {
    if (!isPlatformLive("facebook")) return { communities: [], isLive: false };
    return liveFacebookSearch(input.query);
  },

  async getCommunity(communityId: string): Promise<CommunityData | null> {
    if (!isPlatformLive("facebook")) return null;
    return liveGetFacebookCommunity(communityId);
  },
};
