/**
 * Substack mock data generator.
 * Simulates newsletter publication communities.
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

const SUBSTACK_NAMES = [
  "Casey Newton",
  "Heather Cox Richardson",
  "Matt Taibbi",
  "Lenny Rachitsky",
  "Packy McCormick",
  "Noah Smith",
  "Anne-Laure Le Cunff",
  "Charlotte Grysolle",
  "Dan Shipper",
  "Tomas Pueyo",
];

const SUBSTACK_KEYWORDS = [
  "Newsletter",
  "LongRead",
  "Opinion",
  "Analysis",
  "Investigation",
  "Dispatch",
  "Briefing",
  "Deep Dive",
  "Roundup",
  "Letter",
];

const SUBSTACK_TITLES = [
  "The state of everything: an honest assessment",
  "What nobody is talking about (but should be)",
  "My predictions for the next 12 months",
  "A long-form investigation: what really happened",
  "Subscriber Q&A: Your best questions, answered",
  "The underrated trend that's changing everything",
  "Links worth your time this week",
  "I changed my mind about this — here's why",
];

/**
 * Generates a mock Substack publication CommunityData.
 */
export function mockSubstackCommunity(query: string, index: number): CommunityData {
  const rng = seededRng(`substack-${query}-${index}`);
  const slug = query.toLowerCase().replace(/\s+/g, "") + (index > 0 ? index : "");
  const size = randInt(1000, 500000, rng);
  const authorName = SUBSTACK_NAMES[Math.floor(rng() * SUBSTACK_NAMES.length)];

  return {
    platform: "substack",
    community_id: `substack_${slug}`,
    community_name: `${query} — Substack`,
    community_size: size,
    description: `A Substack publication covering ${query}. ${size.toLocaleString()} paid and free subscribers.`,
    conversation_categories: generateCategories(`substack-${query}-${index}`),
    trending_topics: generateTopics(`substack-${query}-${index}`, SUBSTACK_KEYWORDS),
    trending_content: generateContent(`substack-${query}-${index}`, "substack", "article", SUBSTACK_TITLES),
    top_voices: generateTopVoices(`substack-${query}-${index}`, "substack", "", SUBSTACK_NAMES),
    last_updated: new Date().toISOString(),
  };
}

export async function mockSubstackSearch(query: string): Promise<PlatformSearchResult> {
  const communities = [0, 1, 2].map((i) => mockSubstackCommunity(query, i));
  return { communities, isLive: false };
}

export async function mockGetSubstackCommunity(communityId: string): Promise<CommunityData | null> {
  const match = communityId.match(/^substack_(.+?)(\d+)?$/);
  if (!match) return null;
  const query = match[1];
  const index = match[2] ? parseInt(match[2], 10) : 0;
  return mockSubstackCommunity(query, index);
}
