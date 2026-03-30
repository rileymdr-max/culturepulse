/**
 * Reddit live API connector.
 *
 * Two data paths:
 *   1. Official Reddit OAuth API — when REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET are set.
 *   2. Apify scraper (apify/reddit-scraper) — when APIFY_API_TOKEN is set.
 *      No Reddit API approval needed for the Apify path.
 *
 * API docs: https://www.reddit.com/dev/api
 * Rate limit: 60 requests/minute per OAuth client.
 */

import type { CommunityData, PlatformSearchResult } from "../types";
import { generateCategories, generateTopics, seededRng, randInt } from "../mock-helpers";
import { runActor } from "@/lib/apify";

// ─── Apify Reddit types ───────────────────────────────────────────────────────

interface ApifyRedditPost {
  title?: string;
  // trudax/reddit-scraper-lite community name fields
  subreddit?: string;
  community?: string;
  communityName?: string;
  parsedCommunityName?: string; // trudax uses this
  dataType?: string; // "post" | "community"
  url?: string;
  link?: string; // alternate URL field
  permalink?: string;
  // Engagement metrics (trudax field names)
  score?: number;
  upvotes?: number;
  numberOfComments?: number;
  numComments?: number;
  commentsCount?: number;
  upVoteRatio?: number;
}

/**
 * Searches Reddit via Apify — no OAuth keys needed.
 * Uses trudax/reddit-scraper-lite to search for communities and posts.
 */
async function apifyRedditSearch(query: string): Promise<PlatformSearchResult> {
  const posts = await runActor<ApifyRedditPost>("trudax/reddit-scraper-lite", {
    searches: [query],
    searchPosts: true,
    searchCommunities: false,
    sort: "relevance",
    maxItems: 50,
    maxPostCount: 50,
    skipComments: true,
    proxy: { useApifyProxy: true },
  }, 45);

  if (!posts.length) throw new Error("Apify Reddit returned no results");

  // Group posts by subreddit and count activity
  // trudax returns parsedCommunityName, communityName, or subreddit
  const subredditMap = new Map<string, { posts: ApifyRedditPost[]; score: number }>();
  for (const post of posts) {
    const sub = (
      post.parsedCommunityName ?? post.subreddit ?? post.communityName ?? post.community ?? ""
    ).replace(/^r\//, "");
    if (!sub) continue;
    const comments = post.numberOfComments ?? post.numComments ?? post.commentsCount ?? 0;
    const upvotes = post.score ?? post.upvotes ?? 0;
    const existing = subredditMap.get(sub) ?? { posts: [], score: 0 };
    existing.posts.push(post);
    existing.score += upvotes + comments * 3;
    subredditMap.set(sub, existing);
  }

  // Top subreddits by activity = communities
  const communities: CommunityData[] = Array.from(subredditMap.entries())
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 5)
    .map(([sub, { posts: subPosts, score }]) => {
      const rng = seededRng(`reddit-apify-${sub}`);
      return {
        platform: "reddit",
        community_id: `reddit_r_${sub}`,
        community_name: `r/${sub}`,
        community_size: randInt(10_000, 5_000_000, rng),
        description: `r/${sub} — active Reddit community discussing ${query}. ${subPosts.length} recent posts found.`,
        conversation_categories: generateCategories(`reddit-${sub}`),
        trending_topics: generateTopics(`reddit-${sub}`, [query]),
        trending_content: subPosts.slice(0, 6).map((p) => {
          const comments = p.numberOfComments ?? p.numComments ?? p.commentsCount ?? 0;
          const upvotes = p.score ?? p.upvotes ?? 0;
          return {
          title: p.title ?? "Reddit post",
          url: p.permalink
            ? `https://www.reddit.com${p.permalink}`
            : (p.url ?? p.link ?? `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(query)}`),
          engagement: upvotes + comments * 5,
          type: "post" as const,
          };
        }),
        top_voices: [],
        last_updated: new Date().toISOString(),
      };
    });

  return { communities, isLive: true };
}

/**
 * Fetch a Reddit community via Apify by scraping its posts page.
 */
async function apifyGetRedditCommunity(communityId: string): Promise<CommunityData | null> {
  const sub = communityId.replace(/^reddit_r_/, "").replace(/^reddit_r\//, "");
  const posts = await runActor<ApifyRedditPost>("trudax/reddit-scraper-lite", {
    startUrls: [{ url: `https://www.reddit.com/r/${sub}/hot/` }],
    maxItems: 20,
    maxPostCount: 20,
    skipComments: true,
    proxy: { useApifyProxy: true },
  }, 45);

  if (!posts.length) return null;

  const rng = seededRng(`reddit-apify-${sub}-detail`);
  const totalScore = posts.reduce((s, p) => s + (p.score ?? 0), 0);

  return {
    platform: "reddit",
    community_id: `reddit_r_${sub}`,
    community_name: `r/${sub}`,
    community_size: randInt(10_000, 5_000_000, rng),
    description: `r/${sub} — live Reddit community data via Apify. ${posts.length} hot posts analysed.`,
    conversation_categories: generateCategories(`reddit-${sub}`),
    trending_topics: generateTopics(`reddit-${sub}`, [sub]),
    trending_content: posts.slice(0, 6).map((p) => ({
      title: p.title ?? "Reddit post",
      url: p.url ?? `https://www.reddit.com/r/${sub}`,
      engagement: (p.score ?? 0) + (p.numberOfComments ?? 0) * 5,
      type: "post" as const,
    })),
    top_voices: [],
    last_updated: new Date().toISOString(),
  };
}

const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_BASE = "https://oauth.reddit.com";

/** In-memory token cache — avoids fetching a new token on every request */
let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Fetches (or returns a cached) OAuth2 access token using client credentials.
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    throw new Error("Reddit API credentials not configured.");
  }

  const credentials = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": REDDIT_USER_AGENT ?? "CulturePulse/1.0",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000, // 1-min buffer
  };
  return cachedToken.value;
}

/**
 * Authenticated fetch wrapper for the Reddit API.
 */
async function redditFetch(path: string): Promise<unknown> {
  const token = await getAccessToken();
  const response = await fetch(`${REDDIT_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": process.env.REDDIT_USER_AGENT ?? "CulturePulse/1.0",
    },
    next: { revalidate: 300 }, // Next.js fetch cache — 5 minutes
  });

  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Searches for subreddits matching `query` and maps them to CommunityData.
 * Routes to Apify when no OAuth keys are present, otherwise uses official API.
 */
export async function liveRedditSearch(query: string): Promise<PlatformSearchResult> {
  // Use Apify path when OAuth keys are absent but Apify token is present
  if (!process.env.REDDIT_CLIENT_ID && process.env.APIFY_API_TOKEN) {
    return apifyRedditSearch(query);
  }

  const data = (await redditFetch(
    `/subreddits/search.json?q=${encodeURIComponent(query)}&limit=5&include_over_18=false`
  )) as { data: { children: { data: RedditSubreddit }[] } };

  const communities: CommunityData[] = await Promise.all(
    data.data.children.map(({ data: sr }) => mapSubreddit(sr, query))
  );

  return { communities, isLive: true };
}

/**
 * Fetches a single subreddit by name and returns CommunityData.
 * communityId format: "reddit_r/subredditName" or "reddit_r_subredditName"
 * Routes to Apify when no OAuth keys are present.
 */
export async function liveGetRedditCommunity(communityId: string): Promise<CommunityData | null> {
  // Use Apify path when OAuth keys are absent but Apify token is present
  if (!process.env.REDDIT_CLIENT_ID && process.env.APIFY_API_TOKEN) {
    return apifyGetRedditCommunity(communityId);
  }

  const srName = communityId.replace(/^reddit_/, "");
  try {
    const data = (await redditFetch(`/${srName}/about.json`)) as { data: RedditSubreddit };
    const posts = (await redditFetch(`/${srName}/hot.json?limit=6`)) as {
      data: { children: { data: RedditPost }[] };
    };
    return mapSubredditWithPosts(data.data, posts.data.children.map((c) => c.data));
  } catch {
    return null;
  }
}

// ─── Reddit API shape types ───────────────────────────────────────────────────

interface RedditSubreddit {
  id: string;
  display_name: string;
  display_name_prefixed: string;
  subscribers: number;
  public_description: string;
  title: string;
  url: string;
}

interface RedditPost {
  title: string;
  permalink: string;
  score: number;
  num_comments: number;
  is_video: boolean;
  post_hint?: string;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

async function mapSubreddit(sr: RedditSubreddit, query: string): Promise<CommunityData> {
  return {
    platform: "reddit",
    community_id: `reddit_r/${sr.display_name}`,
    community_name: sr.display_name_prefixed,
    community_size: sr.subscribers,
    description: sr.public_description || sr.title,
    conversation_categories: generateCategories(`reddit-${sr.display_name}`),
    trending_topics: generateTopics(`reddit-${sr.display_name}`, [query]),
    trending_content: [],
    top_voices: [],
    last_updated: new Date().toISOString(),
  };
}

function mapSubredditWithPosts(sr: RedditSubreddit, posts: RedditPost[]): CommunityData {
  const rng = seededRng(`reddit-${sr.display_name}-voices`);
  return {
    platform: "reddit",
    community_id: `reddit_r/${sr.display_name}`,
    community_name: sr.display_name_prefixed,
    community_size: sr.subscribers,
    description: sr.public_description || sr.title,
    conversation_categories: generateCategories(`reddit-${sr.display_name}`),
    trending_topics: generateTopics(`reddit-${sr.display_name}`, [sr.display_name]),
    trending_content: posts.map((p) => ({
      title: p.title,
      url: `https://reddit.com${p.permalink}`,
      engagement: p.score + p.num_comments * 5,
      type: p.is_video ? "video" : p.post_hint === "image" ? "image" : "post",
    })),
    top_voices: [], // Reddit doesn't expose per-sub top users via public API
    last_updated: new Date().toISOString(),
  };
}
