/**
 * Substack live data fetcher.
 *
 * Substack has no official public API. This module uses two public endpoints:
 *
 * 1. Substack's undocumented search endpoint (used by the Substack UI):
 *    GET https://substack.com/api/v1/search/publications?query=...
 *
 * 2. RSS feeds for each publication:
 *    https://{slug}.substack.com/feed  — returns recent posts as RSS XML
 *
 * Additionally uses Cheerio to parse RSS XML and extract metadata.
 *
 * No API key required — this works via public HTTP requests.
 * Rate limit: be respectful; add delays for bulk operations.
 */

import type { CommunityData, PlatformSearchResult, TrendingContent } from "../types";
import { generateCategories, generateTopics } from "../mock-helpers";

const SUBSTACK_SEARCH_API = "https://substack.com/api/v1/search/publications";

// ─── Substack search API types ────────────────────────────────────────────────

interface SubstackPublication {
  id: number;
  name: string;
  subdomain: string;
  custom_domain?: string;
  subscriber_count?: number;
  description?: string;
  author_name?: string;
}

interface SubstackSearchResponse {
  publications?: SubstackPublication[];
}

// ─── RSS parsing types ────────────────────────────────────────────────────────

interface RssItem {
  title: string;
  link: string;
  likes?: number;
}

/**
 * Searches Substack publications matching the query.
 * Falls back gracefully if the undocumented endpoint changes.
 */
export async function liveSubstackSearch(query: string): Promise<PlatformSearchResult> {
  const url = `${SUBSTACK_SEARCH_API}?query=${encodeURIComponent(query)}&limit=5`;
  const response = await fetch(url, {
    headers: { "User-Agent": "CulturePulse/1.0" },
    next: { revalidate: 600 }, // 10-minute cache
  });

  if (!response.ok) {
    throw new Error(`Substack search failed: ${response.status}`);
  }

  const data = (await response.json()) as SubstackSearchResponse;
  const publications = data.publications ?? [];

  const communities = await Promise.all(
    publications.slice(0, 3).map((pub) => mapPublication(pub, query))
  );

  return { communities, isLive: true };
}

/**
 * Fetches a single Substack publication by community ID.
 * communityId format: "substack_slug"
 */
export async function liveGetSubstackCommunity(communityId: string): Promise<CommunityData | null> {
  const slug = communityId.replace(/^substack_/, "");
  try {
    const rssItems = await fetchRssFeed(slug);
    return buildCommunityFromRss(slug, slug, rssItems, 0, slug);
  } catch {
    return null;
  }
}

// ─── RSS fetching and parsing ─────────────────────────────────────────────────

/**
 * Fetches and parses the RSS feed for a Substack subdomain.
 * Uses Cheerio for XML parsing (same cheerio version used for HTML scraping).
 */
async function fetchRssFeed(slug: string): Promise<RssItem[]> {
  const feedUrl = `https://${slug}.substack.com/feed`;
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "CulturePulse/1.0" },
    next: { revalidate: 300 },
  });

  if (!response.ok) throw new Error(`RSS fetch failed for ${slug}: ${response.status}`);

  const xml = await response.text();

  // Dynamic import so cheerio is only loaded when needed
  const { load } = await import("cheerio");
  const $ = load(xml, { xmlMode: true });

  const items: RssItem[] = [];
  $("item").each((_, el) => {
    const title = $(el).find("title").first().text().trim();
    const link = $(el).find("link").first().text().trim() || $(el).find("guid").first().text().trim();
    if (title && link) {
      items.push({ title, link });
    }
  });

  return items.slice(0, 8);
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

async function mapPublication(pub: SubstackPublication, query: string): Promise<CommunityData> {
  let rssItems: RssItem[] = [];
  try {
    rssItems = await fetchRssFeed(pub.subdomain);
  } catch {
    // RSS might be unavailable — degrade gracefully
  }

  return buildCommunityFromRss(
    pub.subdomain,
    pub.name,
    rssItems,
    pub.subscriber_count ?? 0,
    query,
    pub.description,
    pub.author_name
  );
}

function buildCommunityFromRss(
  slug: string,
  name: string,
  items: RssItem[],
  subscriberCount: number,
  query: string,
  description?: string,
  authorName?: string
): CommunityData {
  const trendingContent: TrendingContent[] = items.map((item, i) => ({
    title: item.title,
    url: item.link,
    engagement: Math.max(0, 10000 - i * 1000), // Approximate decay for ranked items
    type: "article",
  }));

  return {
    platform: "substack",
    community_id: `substack_${slug}`,
    community_name: name || slug,
    community_size: subscriberCount,
    description: description || `Substack publication: ${name || slug}`,
    conversation_categories: generateCategories(`substack-${slug}`),
    trending_topics: generateTopics(`substack-${slug}`, [query]),
    trending_content: trendingContent,
    top_voices: authorName
      ? [
          {
            name: authorName,
            handle: slug,
            followers: subscriberCount,
            url: `https://${slug}.substack.com`,
          },
        ]
      : [],
    last_updated: new Date().toISOString(),
  };
}

