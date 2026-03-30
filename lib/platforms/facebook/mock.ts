/**
 * Facebook mock data generator.
 * Simulates Facebook public Groups and Pages as communities.
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

const FACEBOOK_NAMES = [
  "Community Manager Pro",
  "Group Growth Expert",
  "Page Builder",
  "Local Connect",
  "NicheAuthority",
  "EngagementKing",
  "FanPageGuru",
  "GroupLeader",
  "ContentCreator",
  "CommunityBuilder",
];

const FACEBOOK_KEYWORDS = [
  "Group",
  "Page",
  "Event",
  "Live",
  "Reel",
  "Poll",
  "Watch Party",
  "Fundraiser",
  "Marketplace",
  "Community",
];

const FACEBOOK_TITLES = [
  "Welcome new members — introduce yourself in the comments!",
  "Weekly discussion thread — what's on your mind?",
  "LIVE Q&A happening now — join us!",
  "Poll: what topic should we cover next month?",
  "Sharing the most helpful resource I've found this year",
  "Group milestone: 50,000 members! Here's how we got here",
  "Upcoming event — mark your calendars",
  "A huge thank you to our most active contributors",
];

/**
 * Generates a mock Facebook Group/Page CommunityData.
 */
export function mockFacebookCommunity(query: string, index: number): CommunityData {
  const rng = seededRng(`facebook-${query}-${index}`);
  const name = `${query} Community${index > 0 ? ` ${index + 1}` : ""}`;
  const size = randInt(1000, 5000000, rng);
  const type = rng() > 0.5 ? "Group" : "Page";

  return {
    platform: "facebook",
    community_id: `facebook_${query.toLowerCase().replace(/\s+/g, "_")}${index > 0 ? `_${index}` : ""}`,
    community_name: name,
    community_size: size,
    description: `Facebook ${type} for ${query} enthusiasts. ${size.toLocaleString()} ${type === "Group" ? "members" : "followers"}.`,
    conversation_categories: generateCategories(`facebook-${query}-${index}`),
    trending_topics: generateTopics(`facebook-${query}-${index}`, FACEBOOK_KEYWORDS),
    trending_content: generateContent(`facebook-${query}-${index}`, "facebook", "post", FACEBOOK_TITLES),
    top_voices: generateTopVoices(`facebook-${query}-${index}`, "facebook", "", FACEBOOK_NAMES),
    last_updated: new Date().toISOString(),
  };
}

export async function mockFacebookSearch(query: string): Promise<PlatformSearchResult> {
  const communities = [0, 1, 2].map((i) => mockFacebookCommunity(query, i));
  return { communities, isLive: false };
}

export async function mockGetFacebookCommunity(communityId: string): Promise<CommunityData | null> {
  const match = communityId.match(/^facebook_(.+?)(?:_(\d+))?$/);
  if (!match) return null;
  const query = match[1].replace(/_/g, " ");
  const index = match[2] ? parseInt(match[2], 10) : 0;
  return mockFacebookCommunity(query, index);
}
