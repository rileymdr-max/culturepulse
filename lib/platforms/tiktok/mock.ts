/**
 * TikTok mock data generator.
 * Simulates hashtag-based TikTok communities and creator ecosystems.
 */

import type { CommunityData, PlatformSearchResult } from "../types";
import {
  seededRng,
  randInt,
  generateCategories,
  generateTopics,
  generateTopVoices,
  generateContent,
} from "../mock-helpers";

const TIKTOK_NAMES = [
  "CharlieDamelio",
  "Khaby.Lame",
  "BelledelphineReal",
  "AddisonRae",
  "ZachKing",
  "SpencerX",
  "BabyAriel",
  "MrBeast",
  "LorenGray",
  "NicheMaker",
];

const TIKTOK_KEYWORDS = [
  "FYP",
  "ForYouPage",
  "Duet",
  "Stitch",
  "Trend",
  "Sound",
  "POV",
  "Grwm",
  "TikTokMadeMeBuyIt",
  "Viral",
];

const TIKTOK_TITLES = [
  "POV: you just discovered the most niche community on TikTok",
  "This trend is everywhere right now and here's why",
  "Reacting to the best content in this space this week",
  "The algorithm pushed this to 2M people overnight",
  "Duet with the most viral video in this niche",
  "Storytime: how I grew 100k followers talking about this",
  "Things only this community will understand #FYP",
  "Watch me try the viral trend everyone's doing",
];

/**
 * Generates a mock TikTok hashtag community CommunityData.
 */
export function mockTikTokCommunity(query: string, index: number): CommunityData {
  const rng = seededRng(`tiktok-${query}-${index}`);
  const hashtag = `#${query.replace(/\s+/g, "")}${index > 0 ? index : ""}`;
  const size = randInt(50000, 50000000, rng);
  const viewCount = randInt(1000000, 5000000000, rng);

  return {
    platform: "tiktok",
    community_id: `tiktok_${hashtag.replace("#", "")}`,
    community_name: hashtag,
    community_size: viewCount, // TikTok community size = hashtag view count
    description: `TikTok hashtag community for ${hashtag}. ${viewCount.toLocaleString()} total views. ${size.toLocaleString()} videos created.`,
    conversation_categories: generateCategories(`tiktok-${query}-${index}`),
    trending_topics: generateTopics(`tiktok-${query}-${index}`, TIKTOK_KEYWORDS),
    trending_content: generateContent(`tiktok-${query}-${index}`, "tiktok", "video", TIKTOK_TITLES),
    top_voices: generateTopVoices(`tiktok-${query}-${index}`, "tiktok", "@", TIKTOK_NAMES),
    last_updated: new Date().toISOString(),
  };
}

export async function mockTikTokSearch(query: string): Promise<PlatformSearchResult> {
  const communities = [0, 1, 2].map((i) => mockTikTokCommunity(query, i));
  return { communities, isLive: false };
}

export async function mockGetTikTokCommunity(communityId: string): Promise<CommunityData | null> {
  const match = communityId.match(/^tiktok_(.+?)(\d+)?$/);
  if (!match) return null;
  const query = match[1];
  const index = match[2] ? parseInt(match[2], 10) : 0;
  return mockTikTokCommunity(query, index);
}
