/**
 * Instagram mock data generator.
 * Simulates hashtag and creator communities on Instagram.
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

const INSTAGRAM_NAMES = [
  "NatGeo",
  "NASA",
  "9gag",
  "therock",
  "cristiano",
  "kyliejenner",
  "kimkardashian",
  "leomessi",
  "selenagomez",
  "beyonce",
];

const INSTAGRAM_KEYWORDS = [
  "Reel",
  "Story",
  "Collab",
  "Carousel",
  "Explore",
  "Aesthetic",
  "Inspo",
  "GRWM",
  "ootd",
  "Lifestyle",
];

const REEL_TITLES = [
  "The aesthetic that's taking over my feed right now ✨",
  "POV: Finding your niche and building a real audience",
  "This got 1M views in 48 hours — here's what I did differently",
  "Things that just make sense if you're in this community",
  "The most underrated content style in this space",
  "Collab drop with the biggest creator in the niche",
  "Watch me build my brand from scratch in 30 days",
  "Day in the life of someone obsessed with this aesthetic",
];

/**
 * Generates a mock Instagram hashtag community.
 */
export function mockInstagramCommunity(query: string, index: number): CommunityData {
  const rng = seededRng(`instagram-${query}-${index}`);
  const hashtag = `#${query.replace(/\s+/g, "")}${index > 0 ? index : ""}`;
  const postCount = randInt(10000, 100000000, rng);

  return {
    platform: "instagram",
    community_id: `instagram_${hashtag.replace("#", "")}`,
    community_name: hashtag,
    community_size: postCount,
    description: `Instagram hashtag community for ${hashtag}. ${postCount.toLocaleString()} posts tagged.`,
    conversation_categories: generateCategories(`instagram-${query}-${index}`),
    trending_topics: generateTopics(`instagram-${query}-${index}`, INSTAGRAM_KEYWORDS),
    trending_content: generateContent(`instagram-${query}-${index}`, "instagram", "reel", REEL_TITLES),
    top_voices: generateTopVoices(`instagram-${query}-${index}`, "instagram", "@", INSTAGRAM_NAMES),
    last_updated: new Date().toISOString(),
  };
}

export async function mockInstagramSearch(query: string): Promise<PlatformSearchResult> {
  const communities = [0, 1, 2].map((i) => mockInstagramCommunity(query, i));
  return { communities, isLive: false };
}

export async function mockGetInstagramCommunity(communityId: string): Promise<CommunityData | null> {
  const match = communityId.match(/^instagram_(.+?)(\d+)?$/);
  if (!match) return null;
  const query = match[1];
  const index = match[2] ? parseInt(match[2], 10) : 0;
  return mockInstagramCommunity(query, index);
}
