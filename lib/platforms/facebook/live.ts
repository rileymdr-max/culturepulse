/**
 * Facebook live API connector — STUB with setup instructions.
 *
 * ─── REQUIREMENTS ─────────────────────────────────────────────────────────────
 * The Facebook Graph API for Groups/Pages requires:
 *   1. A Facebook Developer account (https://developers.facebook.com)
 *   2. An approved app with appropriate permissions
 *   3. A Page Access Token or User Access Token
 *
 * ⚠️  IMPORTANT: Facebook's Graph API has significantly restricted access
 *     to public group data since the Cambridge Analytica incident (2018).
 *     Reading public group posts requires the "groups_access_member_info"
 *     permission, which is App Review-gated and rarely approved for new apps.
 *
 * For Pages (vs Groups), access is much more straightforward.
 *
 * ─── SETUP STEPS ──────────────────────────────────────────────────────────────
 *
 * 1. Create a Meta Developer app at https://developers.facebook.com/apps
 *    Choose "Business" app type.
 *
 * 2. Add the "Facebook Login" and "Pages API" products.
 *
 * 3. Request these permissions in App Review:
 *    - pages_read_engagement     (read Page posts/reactions)
 *    - pages_read_user_content   (read user posts on the Page)
 *    - page_events               (read Page events)
 *
 * 4. Generate a Page Access Token:
 *    GET /me/accounts?access_token={user-token}
 *    → Returns page access tokens for all Pages you manage.
 *
 * 5. Set environment variables:
 *      FACEBOOK_ACCESS_TOKEN   — long-lived Page or User access token
 *      FACEBOOK_APP_ID         — your app ID
 *      FACEBOOK_APP_SECRET     — your app secret (used for token refresh)
 *
 * ─── KEY ENDPOINTS ────────────────────────────────────────────────────────────
 *
 * Search Pages (does NOT support Groups):
 *   GET /search?q={query}&type=page&fields=id,name,fan_count,description
 *
 * Page posts:
 *   GET /{page-id}/posts?fields=message,story,reactions.summary(true),shares,created_time
 *
 * Page insights (requires page admin access):
 *   GET /{page-id}/insights?metric=page_fans,page_engaged_users
 *
 * API docs: https://developers.facebook.com/docs/graph-api
 * App Review: https://developers.facebook.com/docs/app-review
 *
 * ─── RATE LIMITS ──────────────────────────────────────────────────────────────
 * 200 calls per hour per token.
 * Business-verified apps: 200 per hour per user × number of users.
 */

import type { CommunityData, PlatformSearchResult, TrendingContent } from "../types";
import { generateCategories, generateTopics } from "../mock-helpers";

const FB_API_BASE = "https://graph.facebook.com/v19.0";

/**
 * Authenticated fetch against the Facebook Graph API.
 */
async function fbFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const { FACEBOOK_ACCESS_TOKEN } = process.env;
  if (!FACEBOOK_ACCESS_TOKEN) throw new Error("FACEBOOK_ACCESS_TOKEN not configured.");

  const url = new URL(`${FB_API_BASE}${path}`);
  url.searchParams.set("access_token", FACEBOOK_ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const response = await fetch(url.toString(), { next: { revalidate: 600 } });
  if (!response.ok) throw new Error(`Facebook API error: ${response.status}`);
  return response.json();
}

/**
 * Live Facebook Page search.
 * Note: This only searches public Pages, not Groups (Groups require special approval).
 */
export async function liveFacebookSearch(query: string): Promise<PlatformSearchResult> {
  const data = (await fbFetch("/search", {
    q: query,
    type: "page",
    fields: "id,name,fan_count,description,link",
    limit: "5",
  })) as { data: FbPage[] };

  const communities = await Promise.all(
    (data.data ?? []).slice(0, 3).map((page) => mapPageToCommunity(page, query))
  );

  return { communities, isLive: true };
}

/**
 * Fetches posts for a specific Page to populate community detail.
 * communityId format: "facebook_{page-id}"
 */
export async function liveGetFacebookCommunity(communityId: string): Promise<CommunityData | null> {
  const pageId = communityId.replace(/^facebook_/, "");
  try {
    const [pageData, postsData] = await Promise.all([
      fbFetch(`/${pageId}`, { fields: "id,name,fan_count,description,link" }) as Promise<FbPage>,
      fbFetch(`/${pageId}/posts`, {
        fields: "message,story,reactions.summary(true),shares,created_time",
        limit: "10",
      }) as Promise<{ data: FbPost[] }>,
    ]);
    return mapPageWithPostsToCommunity(pageData, postsData.data ?? []);
  } catch {
    return null;
  }
}

// ─── Facebook API types ───────────────────────────────────────────────────────

interface FbPage {
  id: string;
  name: string;
  fan_count?: number;
  description?: string;
  link?: string;
}

interface FbPost {
  id: string;
  message?: string;
  story?: string;
  reactions?: { summary: { total_count: number } };
  shares?: { count: number };
  created_time: string;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

async function mapPageToCommunity(page: FbPage, query: string): Promise<CommunityData> {
  return {
    platform: "facebook",
    community_id: `facebook_${page.id}`,
    community_name: page.name,
    community_size: page.fan_count ?? 0,
    description: page.description ?? `Facebook Page: ${page.name}`,
    conversation_categories: generateCategories(`facebook-${page.id}`),
    trending_topics: generateTopics(`facebook-${page.id}`, [query]),
    trending_content: [],
    top_voices: [],
    last_updated: new Date().toISOString(),
  };
}

function mapPageWithPostsToCommunity(page: FbPage, posts: FbPost[]): CommunityData {
  const trendingContent: TrendingContent[] = posts.slice(0, 6).map((p) => ({
    title: (p.message ?? p.story ?? "Facebook post").slice(0, 120),
    url: `https://facebook.com/${p.id.replace("_", "/posts/")}`,
    engagement:
      (p.reactions?.summary?.total_count ?? 0) + (p.shares?.count ?? 0) * 3,
    type: "post",
  }));

  return {
    platform: "facebook",
    community_id: `facebook_${page.id}`,
    community_name: page.name,
    community_size: page.fan_count ?? 0,
    description: page.description ?? `Facebook Page: ${page.name}`,
    conversation_categories: generateCategories(`facebook-${page.id}`),
    trending_topics: generateTopics(`facebook-${page.id}`, [page.name]),
    trending_content: trendingContent,
    top_voices: [],
    last_updated: new Date().toISOString(),
  };
}
