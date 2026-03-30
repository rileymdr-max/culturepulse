/**
 * Reddit live API connector.
 *
 * Uses Reddit's OAuth2 client-credentials flow (app-only auth).
 * Required environment variables:
 *   REDDIT_CLIENT_ID      — from https://www.reddit.com/prefs/apps
 *   REDDIT_CLIENT_SECRET  — from the same page
 *   REDDIT_USER_AGENT     — e.g. "CulturePulse/1.0 (by u/YourUsername)"
 *
 * API docs: https://www.reddit.com/dev/api
 * Rate limit: 60 requests/minute per OAuth client.
 */

import type { CommunityData, PlatformSearchResult } from "../types";
import { generateCategories, generateTopics, seededRng, randInt } from "../mock-helpers";

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
 * Uses GET /subreddits/search.json
 */
export async function liveRedditSearch(query: string): Promise<PlatformSearchResult> {
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
 * communityId format: "reddit_r/subredditName"
 */
export async function liveGetRedditCommunity(communityId: string): Promise<CommunityData | null> {
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
