/**
 * Refresh a saved library profile with live data: scrape all six sources for
 * the subculture, have Claude update the profile against that evidence, and
 * store the scrape so the profile page can show it ("Live data" tag).
 *
 * Used by scripts/refresh-subcultures.ts. Cost per profile: roughly $0.20–0.40
 * of Apify credit plus one Claude call.
 */
import type { Subculture } from "@prisma/client";
import { prisma, withDbRetry } from "./prisma";
import { enrichSubcultureWithSignals } from "./subculture-enricher";
import { refreshSubcultureProfile } from "./subculture-generator";
import type { SubcultureProfile, SubcultureSignalData } from "./types/subculture";

// Words that describe a group rather than its topic. Dropping them gives the
// scrapers a phrase people actually post with ("home coffee", not
// "home coffee culture").
const GROUP_WORDS = /\b(culture|community|communities|fandom|fans|enthusiasts|movement|natives|scene)\b/gi;

// Names where trimming alone gives a poor search phrase.
const SEARCH_OVERRIDES: Record<string, string> = {
  "ai-builders-llm-enthusiasts": "AI agents LLM",
  "electronic-rave-culture": "rave techno",
  "y2k-nostalgia-fashion": "Y2K fashion",
  "ev-clean-transport": "electric vehicle",
  "luxury-travel-points-hacking": "points travel hacking",
  "minimalism-intentional-living": "minimalism",
  "homesteading-self-sufficiency": "homesteading",
  "letterboxd-film-culture": "letterboxd films",
  "mobile-casual-gaming": "mobile games",
  "latin-music-urbano-culture": "reggaeton",
  "metal-heavy-music": "metalcore",
  "tabletop-gaming-ttrpg": "dnd ttrpg",
  "trail-running-ultrarunning": "ultrarunning",
  "van-life-nomad-culture": "vanlife",
  "pilates-reformer-culture": "reformer pilates",
  "hot-sauce-spicy-food-culture": "hot sauce",
  "overlanding-off-road": "overlanding",
  "cycling-bikepacking": "gravel bikepacking",
  "golf-disruptors": "golf streetwear",
  "anime-manga-fandom": "anime manga",
  "quiet-luxury-fashion": "quiet luxury",
  "sourdough-bakers": "sourdough",
  "skate-punks": "skate punk",
  "gymtok-fitness": "gymtok",
  "pc-builders": "PC build",
  // Audit-discovered profiles with descriptive names
  "automated-allocators": "portfolio rebalancing script",
  "automated-clip-farmers": "clipping campaign",
  "court-to-controller-crossovers": "WNBA gaming stream",
  "marketing-as-entertainment-spectators": "marketing team cooked",
  "portfolio-career-index-savers": "solo 401k freelancer",
  "tunnel-fit-critics": "tunnel fit",
  "tunnel-to-twitch-style-crossover": "athlete gaming fashion",
  "womens-sports-bull-case-believers": "women's sports valuation",
  "stream-native-sports-fans": "women's sports streaming",
};

export function searchPhraseFor(slug: string, name: string): string {
  if (SEARCH_OVERRIDES[slug]) return SEARCH_OVERRIDES[slug];
  const trimmed = name
    .replace(/[&/]/g, " ")
    .replace(GROUP_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  return trimmed || name;
}

/** True when at least one source returned data. */
export function hasLiveSignals(s: SubcultureSignalData | null | undefined): boolean {
  return !!s && !!(s.reddit || s.tiktok || s.twitter || s.youtube || s.instagram || s.trends);
}

export function toProfile(row: Subculture): SubcultureProfile {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    keywords: row.keywords,
    vernacular: row.vernacular,
    categorical_behaviors: row.categoricalBehaviors,
    moments: row.moments as unknown as SubcultureProfile["moments"],
    media_sources: row.mediaSources as unknown as SubcultureProfile["media_sources"],
    icons: row.icons as unknown as SubcultureProfile["icons"],
    platforms: row.platforms as unknown as SubcultureProfile["platforms"],
    psychographics: row.psychographics as unknown as SubcultureProfile["psychographics"],
    adjacent_subcultures: row.adjacentSubcultures,
    brand_fit_signals: row.brandFitSignals as unknown as SubcultureProfile["brand_fit_signals"],
  };
}

export type RefreshResult =
  | { ok: true; sources: string[] }
  | { ok: false; reason: string };

export async function refreshLibraryProfile(
  row: Subculture,
  opts: { dryRun?: boolean } = {}
): Promise<RefreshResult> {
  const query = searchPhraseFor(row.slug, row.name);
  const signals = await enrichSubcultureWithSignals(query);
  const sources = (["reddit", "tiktok", "twitter", "youtube", "instagram", "trends"] as const)
    .filter((k) => signals[k]);

  // Fewer than 2 sources is too thin to rewrite a profile on — keep the old one.
  if (sources.length < 2) {
    return { ok: false, reason: `only ${sources.length} source(s) returned data for "${query}"` };
  }

  const updated = await refreshSubcultureProfile(toProfile(row), signals);
  if (opts.dryRun) return { ok: true, sources };

  await withDbRetry(() =>
    prisma.subculture.update({
      where: { id: row.id },
      data: {
        description: updated.description,
        keywords: updated.keywords,
        vernacular: updated.vernacular,
        categoricalBehaviors: updated.categorical_behaviors,
        moments: updated.moments as object[],
        mediaSources: updated.media_sources as object[],
        icons: updated.icons as object[],
        platforms: updated.platforms as object[],
        psychographics: updated.psychographics as object,
        adjacentSubcultures: updated.adjacent_subcultures,
        brandFitSignals: updated.brand_fit_signals as object,
        signalData: signals as object,
        enrichedByApify: true,
      },
    })
  );
  return { ok: true, sources };
}
