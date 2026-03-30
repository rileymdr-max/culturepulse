/**
 * TikTok live connector — powered by Apify's TikTok scraper.
 *
 * Uses the `clockworks/tiktok-scraper` Apify actor to search TikTok by
 * both keyword AND hashtag simultaneously, then merges results for a
 * fuller picture of the community.
 *
 * No TikTok API approval needed — Apify scrapes it directly.
 * Requires: APIFY_API_TOKEN in environment variables.
 *
 * Falls back to mock data if Apify is unavailable or times out.
 */

import type { CommunityData, PlatformSearchResult, TrendingContent, TopVoice } from "../types";
import { generateCategories } from "../mock-helpers";
import { runActor } from "@/lib/apify";

const TIKTOK_ACTOR = "clockworks/tiktok-scraper";

// ─── Apify TikTok video shape ─────────────────────────────────────────────────

interface ApifyTikTokVideo {
  id?: string;
  text?: string;
  webVideoUrl?: string;
  diggCount?: number;
  shareCount?: number;
  playCount?: number;
  commentCount?: number;
  authorMeta?: {
    name?: string;
    nickName?: string;
    fans?: number;
    verified?: boolean;
  };
  hashtags?: Array<{ name?: string }>;
}

/**
 * Searches TikTok by keyword AND hashtag for maximum coverage.
 * Merges and deduplicates results from both search modes.
 */
export async function liveTikTokSearch(query: string): Promise<PlatformSearchResult> {
  // Build search terms: keyword as-is + hashtag variant (no spaces)
  const hashtagQuery = `#${query.replace(/\s+/g, "").replace(/^#/, "")}`;
  const searchTerms = query.startsWith("#")
    ? [query]
    : [query, hashtagQuery];

  const videos = await runActor<ApifyTikTokVideo>(
    TIKTOK_ACTOR,
    {
      searchQueries: searchTerms,
      resultsPerPage: 20,
      maxResults: 30,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
    },
    90
  );

  if (!videos.length) {
    throw new Error("TikTok scraper returned no results");
  }

  const community = mapVideosToCommunity(query, videos);
  return { communities: [community], isLive: true };
}

/**
 * Fetches a specific TikTok hashtag community by ID.
 * communityId format: "tiktok_hashtag"
 */
export async function liveGetTikTokCommunity(communityId: string): Promise<CommunityData | null> {
  const tag = communityId.replace(/^tiktok_/, "");
  try {
    const videos = await runActor<ApifyTikTokVideo>(
      TIKTOK_ACTOR,
      {
        searchQueries: [`#${tag}`, tag],
        resultsPerPage: 20,
        maxResults: 30,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
      },
      90
    );
    if (!videos.length) return null;
    return mapVideosToCommunity(tag, videos);
  } catch {
    return null;
  }
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapVideosToCommunity(query: string, videos: ApifyTikTokVideo[]): CommunityData {
  // Deduplicate by video ID
  const seen = new Set<string>();
  const unique = videos.filter((v) => {
    if (!v.id || seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });

  // Total engagement as community size proxy
  const totalEngagement = unique.reduce((sum, v) => {
    return sum + (v.diggCount ?? 0) + (v.shareCount ?? 0) * 2 + (v.commentCount ?? 0);
  }, 0);

  // Top voices — unique creators sorted by follower count
  const creatorMap = new Map<string, ApifyTikTokVideo["authorMeta"] & { engagement: number }>();
  for (const v of unique) {
    const nick = v.authorMeta?.nickName;
    if (!nick) continue;
    const eng = (v.diggCount ?? 0) + (v.shareCount ?? 0) * 2;
    const existing = creatorMap.get(nick);
    if (!existing || eng > existing.engagement) {
      creatorMap.set(nick, { ...v.authorMeta, engagement: eng });
    }
  }
  const topVoices: TopVoice[] = Array.from(creatorMap.values())
    .sort((a, b) => (b.fans ?? 0) - (a.fans ?? 0))
    .slice(0, 5)
    .map((creator) => ({
      // nickName = display name, name = @username (used in URLs)
      name: creator.nickName ?? creator.name ?? "Unknown",
      handle: `@${creator.name ?? creator.nickName ?? "unknown"}`,
      followers: creator.fans ?? 0,
      url: `https://www.tiktok.com/@${creator.name ?? creator.nickName ?? ""}`,
    }));

  // Trending content — top videos by engagement
  const trendingContent: TrendingContent[] = unique
    .sort((a, b) => {
      const engA = (a.diggCount ?? 0) + (a.shareCount ?? 0) * 2;
      const engB = (b.diggCount ?? 0) + (b.shareCount ?? 0) * 2;
      return engB - engA;
    })
    .slice(0, 6)
    .map((v) => ({
      title: (v.text ?? "TikTok video").slice(0, 120),
      url: v.webVideoUrl ?? `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`,
      engagement: (v.diggCount ?? 0) + (v.shareCount ?? 0) * 2 + (v.commentCount ?? 0),
      type: "video",
    }));

  // Extract hashtag frequencies across all videos
  const hashtagCounts: Record<string, number> = {};
  for (const v of unique) {
    for (const tag of v.hashtags ?? []) {
      if (tag.name) {
        hashtagCounts[tag.name] = (hashtagCounts[tag.name] ?? 0) + 1;
      }
    }
  }
  const trendingTopics = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([tag, count]) => ({
      topic: `#${tag}`,
      volume: count * 5000,
      velocity: Math.round(count * 15),
    }));

  const cleanQuery = query.replace(/^#/, "");

  return {
    platform: "tiktok",
    community_id: `tiktok_${cleanQuery.replace(/\s+/g, "_").toLowerCase()}`,
    community_name: `#${cleanQuery.replace(/\s+/g, "")}`,
    community_size: totalEngagement,
    description: `Live TikTok community for "${query}". ${unique.length} recent videos analysed across keyword and hashtag search.`,
    conversation_categories: generateCategories(`tiktok-${cleanQuery}`),
    trending_topics: trendingTopics,
    trending_content: trendingContent,
    top_voices: topVoices,
    last_updated: new Date().toISOString(),
  };
}
