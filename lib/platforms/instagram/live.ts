/**
 * Instagram live API connector — STUB with setup instructions.
 *
 * ─── REQUIREMENTS ─────────────────────────────────────────────────────────────
 * The Instagram Graph API requires:
 *   1. A Facebook Developer account (https://developers.facebook.com)
 *   2. A Facebook Business account linked to an Instagram Professional account
 *   3. An approved app with the instagram_basic and pages_read_engagement permissions
 *
 * Public hashtag data requires the instagram_manage_insights permission,
 * which requires Business verification by Meta.
 *
 * ─── SETUP STEPS ──────────────────────────────────────────────────────────────
 *
 * 1. Create a Meta Developer app at https://developers.facebook.com/apps
 *
 * 2. Add the "Instagram Graph API" product to your app.
 *
 * 3. Link your Instagram Professional (Business or Creator) account via
 *    Facebook Page → Instagram account connection.
 *
 * 4. Generate a long-lived User Access Token:
 *    GET https://graph.facebook.com/oauth/access_token
 *      ?client_id={app-id}
 *      &client_secret={app-secret}
 *      &grant_type=fb_exchange_token
 *      &fb_exchange_token={short-lived-token}
 *
 * 5. Find your Instagram Business Account ID:
 *    GET https://graph.facebook.com/v18.0/me/accounts?access_token={token}
 *    → Take the page ID, then:
 *    GET https://graph.facebook.com/v18.0/{page-id}?fields=instagram_business_account
 *
 * 6. Set environment variables:
 *      INSTAGRAM_ACCESS_TOKEN           — long-lived user access token
 *      INSTAGRAM_BUSINESS_ACCOUNT_ID    — your IG business account numeric ID
 *
 * ─── KEY ENDPOINTS ────────────────────────────────────────────────────────────
 *
 * Hashtag search (requires Business account):
 *   GET /ig_hashtag_search?user_id={id}&q={hashtag}
 *   GET /{hashtag-id}/top_media?fields=id,caption,media_type,like_count,comments_count
 *
 * User media:
 *   GET /{user-id}/media?fields=id,caption,media_type,like_count,timestamp
 *
 * API docs: https://developers.facebook.com/docs/instagram-api
 *
 * ─── RATE LIMITS ──────────────────────────────────────────────────────────────
 * 200 calls per hour per token (Business Discovery API).
 * Hashtag search: max 30 unique hashtags per 7 days per user.
 */

import type { CommunityData, PlatformSearchResult } from "../types";
import { generateCategories, generateTopics } from "../mock-helpers";
import { mockInstagramSearch, mockGetInstagramCommunity } from "./mock";

const IG_API_BASE = "https://graph.facebook.com/v19.0";

/**
 * Authenticated fetch against the Instagram Graph API.
 */
async function igFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const { INSTAGRAM_ACCESS_TOKEN } = process.env;
  if (!INSTAGRAM_ACCESS_TOKEN) throw new Error("INSTAGRAM_ACCESS_TOKEN not configured.");

  const url = new URL(`${IG_API_BASE}${path}`);
  url.searchParams.set("access_token", INSTAGRAM_ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const response = await fetch(url.toString(), { next: { revalidate: 600 } });
  if (!response.ok) throw new Error(`Instagram API error: ${response.status}`);
  return response.json();
}

/**
 * Live Instagram hashtag search.
 * NOTE: This requires INSTAGRAM_BUSINESS_ACCOUNT_ID to be set.
 *
 * Implementation is stubbed pending Meta business verification.
 * Replace the throw with real logic once credentials are obtained.
 */
export async function liveInstagramSearch(query: string): Promise<PlatformSearchResult> {
  const { INSTAGRAM_BUSINESS_ACCOUNT_ID } = process.env;
  if (!INSTAGRAM_BUSINESS_ACCOUNT_ID) {
    throw new Error("INSTAGRAM_BUSINESS_ACCOUNT_ID not configured.");
  }

  // Step 1: Get the hashtag ID
  const hashtagSearch = (await igFetch("/ig_hashtag_search", {
    user_id: INSTAGRAM_BUSINESS_ACCOUNT_ID,
    q: query.replace(/^#/, ""),
  })) as { data: { id: string }[] };

  if (!hashtagSearch.data?.length) {
    return { communities: [], isLive: true };
  }

  const hashtagId = hashtagSearch.data[0].id;

  // Step 2: Get top media for the hashtag
  const topMedia = (await igFetch(`/${hashtagId}/top_media`, {
    user_id: INSTAGRAM_BUSINESS_ACCOUNT_ID,
    fields: "id,caption,media_type,like_count,comments_count,permalink",
  })) as { data: IgMedia[] };

  const community = mapHashtagToCommmunity(query, hashtagId, topMedia.data ?? []);
  return { communities: [community], isLive: true };
}

export async function liveGetInstagramCommunity(communityId: string): Promise<CommunityData | null> {
  const tag = communityId.replace(/^instagram_/, "");
  try {
    const result = await liveInstagramSearch(tag);
    return result.communities[0] ?? null;
  } catch {
    return null;
  }
}

// ─── Instagram API types ──────────────────────────────────────────────────────

interface IgMedia {
  id: string;
  caption?: string;
  media_type: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapHashtagToCommmunity(query: string, hashtagId: string, media: IgMedia[]): CommunityData {
  const trendingContent = media.slice(0, 6).map((m) => ({
    title: (m.caption ?? "").slice(0, 120) || `Instagram ${m.media_type.toLowerCase()}`,
    url: m.permalink ?? `https://instagram.com/p/${m.id}`,
    engagement: (m.like_count ?? 0) + (m.comments_count ?? 0) * 5,
    type: m.media_type === "VIDEO" ? "reel" : "post",
  }));

  const totalEngagement = trendingContent.reduce((s, c) => s + c.engagement, 0);

  return {
    platform: "instagram",
    community_id: `instagram_${query.replace(/\s+/g, "")}`,
    community_name: `#${query.replace(/\s+/g, "")}`,
    community_size: totalEngagement,
    description: `Instagram hashtag community for #${query}.`,
    conversation_categories: generateCategories(`instagram-${query}`),
    trending_topics: generateTopics(`instagram-${query}`, [query]),
    trending_content: trendingContent,
    top_voices: [],
    last_updated: new Date().toISOString(),
  };
}
