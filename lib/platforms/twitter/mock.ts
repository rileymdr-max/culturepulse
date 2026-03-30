/**
 * Twitter/X mock data generator.
 * Simulates hashtag-based communities / topic clusters.
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

const TWITTER_NAMES = [
  "TechInsider",
  "CultureWatcher",
  "TrendSpotter",
  "Viralina",
  "HashtagHunter",
  "NicheFinder",
  "AudienceBuilder",
  "ContentKing",
  "MicroVoice",
  "PulseTracker",
];

const TWITTER_KEYWORDS = [
  "Thread",
  "Spaces",
  "Ratio",
  "RT",
  "Trending",
  "Breaking",
  "HotTake",
  "Viral",
  "CloutChasing",
  "TweetStorm",
];

const TWEET_TITLES = [
  "THREAD: Everything you need to know about this space right now 🧵",
  "Hot take that nobody asked for but everyone needed",
  "The community has completely shifted — here's a breakdown",
  "I interviewed 50 people in this niche. Here's what they all said.",
  "Why this hashtag is dominating right now (a thread)",
  "This is the most misunderstood concept in the space",
  "Unpopular opinion: the conversation is going in the wrong direction",
  "Breaking down the numbers so you don't have to",
];

/**
 * Generates a single mock Twitter/X topic-cluster CommunityData.
 */
export function mockTwitterCommunity(query: string, index: number): CommunityData {
  const rng = seededRng(`twitter-${query}-${index}`);
  const hashtag = `#${query.replace(/\s+/g, "")}${index > 0 ? index : ""}`;
  const size = randInt(5000, 5000000, rng);

  return {
    platform: "twitter",
    community_id: `twitter_${hashtag.replace("#", "")}`,
    community_name: hashtag,
    community_size: size,
    description: `Active X/Twitter conversation cluster around ${hashtag}. ${size.toLocaleString()} monthly participants.`,
    conversation_categories: generateCategories(`twitter-${query}-${index}`),
    trending_topics: generateTopics(`twitter-${query}-${index}`, TWITTER_KEYWORDS),
    trending_content: generateContent(`twitter-${query}-${index}`, "twitter", "tweet", TWEET_TITLES),
    top_voices: generateTopVoices(`twitter-${query}-${index}`, "twitter", "@", TWITTER_NAMES),
    last_updated: new Date().toISOString(),
  };
}

export async function mockTwitterSearch(query: string): Promise<PlatformSearchResult> {
  const communities = [0, 1, 2].map((i) => mockTwitterCommunity(query, i));
  return { communities, isLive: false };
}

export async function mockGetTwitterCommunity(communityId: string): Promise<CommunityData | null> {
  const match = communityId.match(/^twitter_(.+?)(\d+)?$/);
  if (!match) return null;
  const query = match[1];
  const index = match[2] ? parseInt(match[2], 10) : 0;
  return mockTwitterCommunity(query, index);
}
