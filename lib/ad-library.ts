/**
 * Meta Ad Library integration via Apify.
 *
 * Uses apify/facebook-ads-scraper to search the public Meta Ad Library
 * (https://www.facebook.com/ads/library/) by keyword.
 *
 * No Meta API approval or access token required — Apify handles the scraping.
 * Requires APIFY_API_TOKEN.
 *
 * Returns ads relevant to a community's topic so users can see what brands
 * are advertising to their target audience.
 */

import { runActor } from "@/lib/apify";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdIntelItem {
  /** Ad headline / title */
  title: string;
  /** Brand / advertiser page name */
  advertiser: string;
  /** Link to the ad in Meta Ad Library */
  adLibraryUrl: string;
  /** Ad body text (truncated) */
  body?: string;
  /** CTA text e.g. "Shop now", "Learn More" */
  callToAction?: string;
  /** Destination URL the ad links to */
  destinationUrl?: string;
  /** Estimated impressions bucket e.g. "1k–5k" */
  impressions?: string;
  /** Date range the ad has been running */
  startDate?: string;
  /** Active or inactive */
  isActive: boolean;
  /** Platform(s) this ad runs on */
  platforms?: string[];
}

interface ApifyFbAd {
  pageId?: string;
  pageName?: string;
  adId?: string;
  adUrl?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  snapshot?: {
    title?: string;
    body?: { text?: string };
    linkUrl?: string;
    cta?: { text?: string };
    cards?: { title?: string; body?: string; linkUrl?: string }[];
  };
  impressionsWithIndex?: { lowerBound?: number; upperBound?: number };
  publisherPlatform?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatImpressions(ad: ApifyFbAd): string | undefined {
  const bounds = ad.impressionsWithIndex;
  if (!bounds) return undefined;
  const lo = bounds.lowerBound;
  const hi = bounds.upperBound;
  if (lo === undefined && hi === undefined) return undefined;
  if (lo !== undefined && hi !== undefined) {
    return `${formatN(lo)}–${formatN(hi)}`;
  }
  return lo !== undefined ? `${formatN(lo)}+` : `≤${formatN(hi!)}`;
}

function formatN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function mapAd(ad: ApifyFbAd): AdIntelItem {
  const snap = ad.snapshot;
  const title =
    snap?.title ||
    snap?.cards?.[0]?.title ||
    ad.pageName ||
    "Sponsored ad";

  const body =
    snap?.body?.text ||
    snap?.cards?.[0]?.body ||
    undefined;

  const destUrl = snap?.linkUrl || snap?.cards?.[0]?.linkUrl || undefined;

  return {
    title,
    advertiser: ad.pageName ?? "Unknown advertiser",
    adLibraryUrl:
      ad.adUrl ??
      (ad.adId
        ? `https://www.facebook.com/ads/library/?id=${ad.adId}`
        : "https://www.facebook.com/ads/library/"),
    body: body ? body.slice(0, 200) : undefined,
    callToAction: snap?.cta?.text,
    destinationUrl: destUrl,
    impressions: formatImpressions(ad),
    startDate: ad.startDate,
    isActive: ad.isActive ?? true,
    platforms: ad.publisherPlatform,
  };
}

// ─── TikTok Ad Library types ──────────────────────────────────────────────────

interface ApifyTikTokAd {
  advertiserName?: string;
  advertiserId?: string;
  adId?: string;
  adUrl?: string;
  videoUrl?: string;
  coverImageUrl?: string;
  adText?: string;
  landingPageUrl?: string;
  impressions?: string; // e.g. "1000-5000"
  region?: string[];
  firstShownDate?: string;
  lastShownDate?: string;
  isActive?: boolean;
  sponsorName?: string;
  objective?: string;
}

function mapTikTokAd(ad: ApifyTikTokAd): AdIntelItem {
  return {
    title: ad.adText?.slice(0, 120) || ad.sponsorName || ad.advertiserName || "TikTok ad",
    advertiser: ad.advertiserName ?? ad.sponsorName ?? "Unknown advertiser",
    adLibraryUrl:
      ad.adUrl ??
      (ad.adId
        ? `https://library.tiktok.com/ads?query=${ad.adId}&query_type=2`
        : "https://library.tiktok.com/ads"),
    body: ad.adText ? ad.adText.slice(0, 200) : undefined,
    callToAction: ad.objective,
    destinationUrl: ad.landingPageUrl,
    impressions: ad.impressions,
    startDate: ad.firstShownDate,
    isActive: ad.isActive ?? true,
    platforms: ["tiktok"],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches Meta Ad Library results for a given search term.
 * Returns up to `limit` ad items (default 12).
 */
export async function fetchMetaAdIntel(
  query: string,
  limit = 12
): Promise<AdIntelItem[]> {
  const ads = await runActor<ApifyFbAd>("apify/facebook-ads-scraper", {
    searchTerms: [query],
    adType: "ALL",
    country: "US",
    maxAds: limit,
    activeStatus: "ALL",
  }, 90);

  return ads.slice(0, limit).map(mapAd);
}

/**
 * Fetches TikTok Ad Library results for a given search term.
 * Uses data_xplorer/tiktok-ads-library-pay-per-event (~$0.001/result).
 * Returns up to `limit` ad items (default 12).
 */
export async function fetchTikTokAdIntel(
  query: string,
  limit = 12
): Promise<AdIntelItem[]> {
  const ads = await runActor<ApifyTikTokAd>("data_xplorer/tiktok-ads-library-pay-per-event", {
    query,
    queryType: "1", // keyword search
    region: "all",
    maxAds: limit,
    fetchDetails: true,
  }, 90);

  return ads.slice(0, limit).map(mapTikTokAd);
}

/**
 * Fetches ad intel from both Meta and TikTok in parallel.
 * Gracefully skips whichever source fails.
 */
export async function fetchAdIntel(
  query: string,
  limit = 12
): Promise<{ meta: AdIntelItem[]; tiktok: AdIntelItem[] }> {
  const [metaResult, tiktokResult] = await Promise.allSettled([
    fetchMetaAdIntel(query, limit),
    fetchTikTokAdIntel(query, limit),
  ]);

  return {
    meta: metaResult.status === "fulfilled" ? metaResult.value : [],
    tiktok: tiktokResult.status === "fulfilled" ? tiktokResult.value : [],
  };
}
