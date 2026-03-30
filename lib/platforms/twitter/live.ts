/**
 * X/Twitter live API connector.
 *
 * Uses the X API v2 with Bearer Token (app-only auth).
 * Required environment variables:
 *   TWITTER_BEARER_TOKEN — from https://developer.twitter.com/en/portal/dashboard
 *
 * Endpoints used:
 *   GET /2/tweets/search/recent — recent tweets matching a query
 *   GET /2/users/by/username    — user profile lookup
 *
 * Rate limits (free tier): 500k tweets/month, 15 req/15min for search.
 * Basic tier: 10k tweets/month read. Pro: 1M tweets/month.
 *
 * API docs: https://developer.twitter.com/en/docs/twitter-api
 */

import type { CommunityData, PlatformSearchResult, TrendingContent, TopVoice } from "../types";
import { generateCategories, generateTopics, seededRng, randInt } from "../mock-helpers";
import { runActor } from "@/lib/apify";

const X_API_BASE = "https://api.twitter.com/2";

// ─── Apify Twitter types ──────────────────────────────────────────────────────

interface ApifyTweet {
  id?: string;
  text?: string;
  fullText?: string;
  url?: string;
  // apidojo/tweet-scraper metric fields
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  viewCount?: number;
  // apidojo uses "tweetBy" for the author object
  tweetBy?: {
    userName?: string;
    displayName?: string;
    followers?: number;
    profileUrl?: string;
    isVerified?: boolean;
  };
  // legacy "author" field kept for compatibility
  author?: {
    userName?: string;
    displayName?: string;
    followers?: number;
    profileUrl?: string;
  };
  // hashtags is a flat string[] in apidojo output
  hashtags?: string[];
  entities?: { hashtags?: { tag: string }[] };
}

/**
 * Searches X/Twitter via Apify — no Twitter API key needed.
 * Uses the apidojo/tweet-scraper actor.
 */
async function apifyTwitterSearch(query: string): Promise<PlatformSearchResult> {
  const tweets = await runActor<ApifyTweet>("apidojo/tweet-scraper", {
    searchTerms: [query],
    maxItems: 50,
    sort: "Latest",
    tweetLanguage: "en",
  }, 90);

  if (!tweets.length) throw new Error("Apify Twitter returned no results");

  const community = mapApifyTweetsToCluster(query, tweets);
  return { communities: [community], isLive: true };
}

/**
 * Fetches a Twitter community by ID via Apify.
 */
async function apifyGetTwitterCommunity(communityId: string): Promise<CommunityData | null> {
  const tag = communityId.replace(/^twitter_/, "");
  try {
    const result = await apifyTwitterSearch(tag);
    return result.communities[0] ?? null;
  } catch {
    return null;
  }
}

function mapApifyTweetsToCluster(query: string, tweets: ApifyTweet[]): CommunityData {
  const totalEngagement = tweets.reduce(
    (s, t) => s + (t.likeCount ?? 0) + (t.retweetCount ?? 0) * 2 + (t.replyCount ?? 0),
    0
  );

  // Deduplicate authors and sort by followers
  // apidojo uses "tweetBy", fall back to "author" for compatibility
  const authorMap = new Map<string, { userName: string; displayName?: string; followers: number; profileUrl?: string }>();
  for (const t of tweets) {
    const a = t.tweetBy ?? t.author;
    if (!a?.userName) continue;
    const existing = authorMap.get(a.userName);
    if (!existing || (a.followers ?? 0) > existing.followers) {
      authorMap.set(a.userName, { ...a, userName: a.userName, followers: a.followers ?? 0 });
    }
  }

  const topVoices: TopVoice[] = Array.from(authorMap.values())
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 5)
    .map((u) => ({
      name: u.displayName ?? u.userName ?? "",
      handle: `@${u.userName}`,
      followers: u.followers,
      url: u.profileUrl ?? `https://x.com/${u.userName}`,
    }));

  const trendingContent: TrendingContent[] = tweets
    .sort((a, b) => {
      const eA = (a.likeCount ?? 0) + (a.retweetCount ?? 0) * 2;
      const eB = (b.likeCount ?? 0) + (b.retweetCount ?? 0) * 2;
      return eB - eA;
    })
    .slice(0, 6)
    .map((t) => {
      const text = t.fullText ?? t.text ?? "";
      return {
        title: text.slice(0, 120) + (text.length > 120 ? "…" : ""),
        url: t.url ?? `https://x.com/search?q=${encodeURIComponent(query)}`,
        engagement: (t.likeCount ?? 0) + (t.retweetCount ?? 0) * 2,
        type: "tweet" as const,
      };
    });

  // Aggregate hashtag frequencies
  // apidojo returns hashtags as string[], legacy returns entities.hashtags[].tag
  const hashtagCounts: Record<string, number> = {};
  for (const tweet of tweets) {
    const tags: string[] = [
      ...(tweet.hashtags ?? []),
      ...(tweet.entities?.hashtags?.map((h) => h.tag) ?? []),
    ];
    for (const tag of tags) {
      hashtagCounts[tag] = (hashtagCounts[tag] ?? 0) + 1;
    }
  }

  return {
    platform: "twitter",
    community_id: `twitter_${query.replace(/\s+/g, "")}`,
    community_name: `#${query.replace(/\s+/g, "")}`,
    community_size: totalEngagement,
    description: `Live X/Twitter conversation cluster for #${query}. ${tweets.length} recent tweets analysed via Apify.`,
    conversation_categories: generateCategories(`twitter-${query}`),
    trending_topics: Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag, count]) => ({
        topic: `#${tag}`,
        volume: count * 1000,
        velocity: Math.round(count * 12),
      })),
    trending_content: trendingContent,
    top_voices: topVoices,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Authenticated fetch against the X API v2.
 */
async function xFetch(path: string): Promise<unknown> {
  const { TWITTER_BEARER_TOKEN } = process.env;
  if (!TWITTER_BEARER_TOKEN) throw new Error("TWITTER_BEARER_TOKEN not configured.");

  const response = await fetch(`${X_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`X API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Searches recent tweets for a query and clusters them into a community result.
 * Because X's API doesn't have a "community search" endpoint, we treat each
 * unique hashtag in the results as a community cluster.
 */
export async function liveTwitterSearch(query: string): Promise<PlatformSearchResult> {
  // Use Apify path when no Bearer Token is present but Apify token is available
  if (!process.env.TWITTER_BEARER_TOKEN && process.env.APIFY_API_TOKEN) {
    return apifyTwitterSearch(query);
  }

  const encoded = encodeURIComponent(`${query} -is:retweet lang:en`);
  const data = (await xFetch(
    `/tweets/search/recent?query=${encoded}&max_results=100` +
      `&tweet.fields=public_metrics,entities,author_id` +
      `&expansions=author_id&user.fields=public_metrics,username,name`
  )) as XSearchResponse;

  const community = mapTweetsToCluster(query, data);
  return { communities: [community], isLive: true };
}

/**
 * Returns a community for a specific hashtag/topic ID.
 * communityId format: "twitter_hashtag"
 */
export async function liveGetTwitterCommunity(communityId: string): Promise<CommunityData | null> {
  // Use Apify path when no Bearer Token is present but Apify token is available
  if (!process.env.TWITTER_BEARER_TOKEN && process.env.APIFY_API_TOKEN) {
    return apifyGetTwitterCommunity(communityId);
  }

  const tag = communityId.replace(/^twitter_/, "");
  try {
    const encoded = encodeURIComponent(`#${tag} -is:retweet lang:en`);
    const data = (await xFetch(
      `/tweets/search/recent?query=${encoded}&max_results=100` +
        `&tweet.fields=public_metrics,entities,author_id` +
        `&expansions=author_id&user.fields=public_metrics,username,name`
    )) as XSearchResponse;
    return mapTweetsToCluster(tag, data);
  } catch {
    return null;
  }
}

// ─── X API shape types ────────────────────────────────────────────────────────

interface XTweet {
  id: string;
  text: string;
  author_id: string;
  public_metrics?: { like_count: number; retweet_count: number; reply_count: number };
  entities?: { hashtags?: { tag: string }[] };
}

interface XUser {
  id: string;
  name: string;
  username: string;
  public_metrics?: { followers_count: number };
}

interface XSearchResponse {
  data?: XTweet[];
  includes?: { users?: XUser[] };
  meta?: { result_count: number };
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapTweetsToCluster(query: string, response: XSearchResponse): CommunityData {
  const tweets = response.data ?? [];
  const users = response.includes?.users ?? [];

  // Aggregate engagement metrics to estimate "community size"
  const totalEngagement = tweets.reduce((sum, t) => {
    const m = t.public_metrics;
    return sum + (m ? m.like_count + m.retweet_count * 2 + m.reply_count : 0);
  }, 0);

  // Extract top voices from users sorted by follower count
  const topVoices: TopVoice[] = users
    .sort((a, b) => (b.public_metrics?.followers_count ?? 0) - (a.public_metrics?.followers_count ?? 0))
    .slice(0, 5)
    .map((u) => ({
      name: u.name,
      handle: `@${u.username}`,
      followers: u.public_metrics?.followers_count ?? 0,
      url: `https://x.com/${u.username}`,
    }));

  // Extract trending content from top tweets
  const trendingContent: TrendingContent[] = tweets
    .sort((a, b) => {
      const engA = a.public_metrics ? a.public_metrics.like_count + a.public_metrics.retweet_count : 0;
      const engB = b.public_metrics ? b.public_metrics.like_count + b.public_metrics.retweet_count : 0;
      return engB - engA;
    })
    .slice(0, 6)
    .map((t) => ({
      title: t.text.slice(0, 120) + (t.text.length > 120 ? "…" : ""),
      url: `https://x.com/i/web/status/${t.id}`,
      engagement: t.public_metrics
        ? t.public_metrics.like_count + t.public_metrics.retweet_count * 2
        : 0,
      type: "tweet",
    }));

  // Extract hashtag frequencies for trending topics
  const hashtagCounts: Record<string, number> = {};
  for (const tweet of tweets) {
    for (const tag of tweet.entities?.hashtags ?? []) {
      hashtagCounts[tag.tag] = (hashtagCounts[tag.tag] ?? 0) + 1;
    }
  }

  return {
    platform: "twitter",
    community_id: `twitter_${query.replace(/\s+/g, "")}`,
    community_name: `#${query.replace(/\s+/g, "")}`,
    community_size: totalEngagement,
    description: `Live X/Twitter conversation cluster for #${query}. ${tweets.length} recent tweets analysed.`,
    conversation_categories: generateCategories(`twitter-${query}`),
    trending_topics: Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag, count]) => ({
        topic: `#${tag}`,
        volume: count * 1000,
        velocity: Math.round(count * 12),
      })),
    trending_content: trendingContent,
    top_voices: topVoices,
    last_updated: new Date().toISOString(),
  };
}
