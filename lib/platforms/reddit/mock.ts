/**
 * Reddit mock data generator.
 * Returns realistic subreddit-shaped data in the unified CommunityData schema.
 * Used when REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET are not configured,
 * or when FORCE_MOCK_DATA=true.
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

const REDDIT_NAMES = [
  "Spez_Fan",
  "karma_collector",
  "AutoModerator",
  "GallowBoob",
  "shittymorph",
  "Poem_for_your_sprog",
  "unidan",
  "kn0thing",
  "merrickc",
  "AWildSketchAppeared",
];

const REDDIT_KEYWORDS = [
  "megathread",
  "AMA",
  "OC",
  "repost",
  "crosspost",
  "flair",
  "karma",
  "gold",
  "mod",
  "subreddit",
];

const CONTENT_TITLES = [
  "After 10 years I finally understand this community",
  "[OC] I spent a month tracking every post — here's what I found",
  "Megathread: Weekly discussion + links",
  "This is the best explanation I've seen — saving for later",
  "Hot take: the meta has completely shifted in the last 6 months",
  "AMA: I've been deep in this space for 5 years, ask me anything",
  "[Discussion] What changed your perspective recently?",
  "Compilation of the best resources from this sub — updated 2025",
];

/**
 * Generates a single mock subreddit CommunityData object.
 * @param query - The search term that produced this result
 * @param index - Position in result list (used to vary output per result)
 */
export function mockRedditCommunity(query: string, index: number): CommunityData {
  const rng = seededRng(`reddit-${query}-${index}`);
  const name = `r/${query.replace(/\s+/g, "_")}${index > 0 ? `_${index}` : ""}`;
  const size = randInt(10000, 8000000, rng);

  return {
    platform: "reddit",
    community_id: `reddit_${name}`,
    community_name: name,
    community_size: size,
    description: `A subreddit dedicated to everything related to ${query}. ${size.toLocaleString()} members strong.`,
    conversation_categories: generateCategories(`reddit-${query}-${index}`),
    trending_topics: generateTopics(`reddit-${query}-${index}`, REDDIT_KEYWORDS),
    trending_content: generateContent(`reddit-${query}-${index}`, "reddit", "post", CONTENT_TITLES),
    top_voices: generateTopVoices(`reddit-${query}-${index}`, "reddit", "u/", REDDIT_NAMES),
    last_updated: new Date().toISOString(),
  };
}

/**
 * Mock search — returns 3 subreddit results for any query.
 */
export async function mockRedditSearch(query: string): Promise<PlatformSearchResult> {
  const communities = [0, 1, 2].map((i) => mockRedditCommunity(query, i));
  return { communities, isLive: false };
}

/**
 * Mock community fetch by ID.
 * Reconstructs deterministic data from the community ID.
 */
export async function mockGetRedditCommunity(communityId: string): Promise<CommunityData | null> {
  // communityId format: "reddit_r/queryName"
  const match = communityId.match(/^reddit_r\/(.+?)(?:_(\d+))?$/);
  if (!match) return null;
  const query = match[1].replace(/_/g, " ");
  const index = match[2] ? parseInt(match[2], 10) : 0;
  return mockRedditCommunity(query, index);
}
