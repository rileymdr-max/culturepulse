/**
 * Shared utilities for generating realistic mock data.
 * All platform mock modules import from here to keep output consistent.
 */

import type {
  ConversationCategory,
  TrendingTopic,
  TrendingContent,
  TopVoice,
  TrendDirection,
} from "./types";

// ─── Deterministic pseudo-random ─────────────────────────────────────────────

/**
 * A simple seeded pseudo-random number generator (mulberry32).
 * Seeding with the community name ensures the same query always returns
 * the same numbers, which prevents hydration mismatches in the UI.
 */
export function seededRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  let state = h >>> 0;
  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a random element from an array using the seeded rng */
export function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Generate an integer in [min, max] using the seeded rng */
export function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Format a large number into a human-readable subscriber count */
export function formatCount(n: number): number {
  return Math.round(n);
}

// ─── Generic content pools ────────────────────────────────────────────────────

const TREND_DIRECTIONS: TrendDirection[] = ["up", "down", "flat"];

const CATEGORY_LABELS = [
  "Product Reviews",
  "How-to Guides",
  "Community News",
  "Debate & Discussion",
  "Recommendations",
  "Memes & Humor",
  "Events & Meetups",
  "Industry Trends",
  "Personal Stories",
  "Q&A",
  "Deals & Offers",
  "Introductions",
];

const TOPIC_ADJECTIVES = [
  "New",
  "Rising",
  "Popular",
  "Viral",
  "Trending",
  "Hot",
  "Emerging",
  "Underground",
];

const TOPIC_NOUNS = [
  "drop",
  "release",
  "collab",
  "thread",
  "discourse",
  "drama",
  "movement",
  "technique",
  "aesthetic",
  "debate",
  "moment",
  "era",
];

// ─── Generator functions ──────────────────────────────────────────────────────

/**
 * Generates a realistic set of conversation categories for a community.
 * @param query - The search query / community name used for seeding
 * @param count - Number of categories to generate (default 6)
 */
export function generateCategories(
  query: string,
  count = 6
): ConversationCategory[] {
  const rng = seededRng(`${query}-categories`);
  const shuffled = [...CATEGORY_LABELS].sort(() => rng() - 0.5);
  return shuffled.slice(0, count).map((label) => ({
    label,
    volume: randInt(500, 50000, rng),
    trend: pick(TREND_DIRECTIONS, rng),
  }));
}

/**
 * Generates trending topics for a community.
 * @param query - Seed string
 * @param keywords - Domain-specific keywords to mix in (makes data feel realistic)
 * @param count - Number of topics (default 8)
 */
export function generateTopics(
  query: string,
  keywords: string[],
  count = 8
): TrendingTopic[] {
  const rng = seededRng(`${query}-topics`);
  const pool = [...keywords, ...TOPIC_ADJECTIVES.map((a) => `${a} ${pick(TOPIC_NOUNS, rng)}`)];
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, count).map((topic) => ({
    topic: `#${topic.replace(/\s+/g, "")}`,
    volume: randInt(1000, 200000, rng),
    velocity: randInt(-30, 120, rng),
  }));
}

/**
 * Generates mock top voices / influencers for a community.
 * @param query - Seed string
 * @param platform - Platform name (used in URL construction)
 * @param handlePrefix - Platform-specific handle prefix (e.g. "u/" for Reddit)
 * @param names - Pool of realistic names to draw from
 * @param count - Number of voices (default 5)
 */
export function generateTopVoices(
  query: string,
  platform: string,
  handlePrefix: string,
  names: string[],
  count = 5
): TopVoice[] {
  const rng = seededRng(`${query}-voices-${platform}`);
  const shuffled = [...names].sort(() => rng() - 0.5);
  return shuffled.slice(0, count).map((name) => {
    const handle = name.toLowerCase().replace(/\s+/g, "_");
    return {
      name,
      handle: `${handlePrefix}${handle}`,
      followers: randInt(5000, 2000000, rng),
      url: platformProfileUrl(platform, handle),
    };
  });
}

/**
 * Generates mock trending content items.
 * @param query - Seed string
 * @param platform - Platform name
 * @param contentType - e.g. "post", "video", "article"
 * @param titles - Pool of realistic content title fragments
 * @param count - Number of items (default 6)
 */
/** Returns a real platform profile URL for a handle — used in top voices */
function platformProfileUrl(platform: string, handle: string): string {
  const h = handle.replace(/^[@u\/r\/]+/, "");
  switch (platform) {
    case "reddit":    return `https://www.reddit.com/user/${h}`;
    case "twitter":   return `https://x.com/${h}`;
    case "tiktok":    return `https://www.tiktok.com/@${h}`;
    case "instagram": return `https://www.instagram.com/${h}/`;
    case "facebook":  return `https://www.facebook.com/${h}`;
    case "substack":  return `https://substack.com/@${h}`;
    default:          return `https://www.google.com/search?q=${encodeURIComponent(h)}`;
  }
}

/** Returns a real platform search URL for a query — used as fallback for mock content */
function platformSearchUrl(platform: string, query: string): string {
  const q = encodeURIComponent(query);
  switch (platform) {
    case "reddit":    return `https://www.reddit.com/search/?q=${q}&sort=top`;
    case "twitter":   return `https://x.com/search?q=${q}&f=live`;
    case "tiktok":    return `https://www.tiktok.com/search?q=${q}`;
    case "instagram": return `https://www.instagram.com/explore/tags/${q}/`;
    case "facebook":  return `https://www.facebook.com/search/posts/?q=${q}`;
    case "substack":  return `https://substack.com/search?query=${q}`;
    default:          return `https://www.google.com/search?q=${q}`;
  }
}

export function generateContent(
  query: string,
  platform: string,
  contentType: string,
  titles: string[],
  count = 6
): import("./types").TrendingContent[] {
  const rng = seededRng(`${query}-content-${platform}`);
  const shuffled = [...titles].sort(() => rng() - 0.5);
  const searchUrl = platformSearchUrl(platform, query);
  return shuffled.slice(0, count).map((title) => ({
    title,
    url: searchUrl,
    engagement: randInt(500, 500000, rng),
    type: contentType,
  }));
}
