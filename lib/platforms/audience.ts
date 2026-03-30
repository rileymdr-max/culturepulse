/**
 * Audience Intelligence — types and mock data generator.
 * Given a social handle + platform, returns the communities where
 * that account's audience is most active.
 */

import { seededRng, randInt, pick } from "./mock-helpers";

export const AUDIENCE_PLATFORMS = [
  "all",
  "reddit",
  "twitter",
  "tiktok",
  "instagram",
  "facebook",
  "substack",
] as const;

export type AudiencePlatform = (typeof AUDIENCE_PLATFORMS)[number];

export interface AudienceCommunity {
  community_id: string;
  community_name: string;
  platform: string;
  community_size: number;
  /** Percentage of the handle's audience active in this community (0–100) */
  overlap_pct: number;
  /** Absolute estimated count of followers active here */
  estimated_overlap: number;
  shared_topics: string[];
  description: string;
}

export interface AudienceResult {
  handle: string;
  platform: string;
  estimated_total_audience: number;
  communities: AudienceCommunity[];
  analyzed_at: string;
}

// ─── Community name pools per platform ───────────────────────────────────────

const COMMUNITY_NAMES: Record<string, string[]> = {
  reddit: [
    "r/technology", "r/gaming", "r/Fitness", "r/Entrepreneur", "r/personalfinance",
    "r/dataisbeautiful", "r/MachineLearning", "r/startups", "r/investing", "r/productivity",
    "r/UIDesign", "r/webdev", "r/cscareerquestions", "r/marketing", "r/SideProject",
  ],
  twitter: [
    "Tech Twitter", "Fintech Twitter", "Crypto Twitter", "Design Twitter", "Indie Hackers",
    "Gaming Twitter", "Film Twitter", "Music Twitter", "Startup Twitter", "AI Twitter",
    "Developer Community", "Creator Economy", "Sports Twitter", "Health & Wellness Twitter",
  ],
  tiktok: [
    "TechTok", "FitTok", "FinanceTok", "BookTok", "FoodTok",
    "GameTok", "StudyTok", "DIYTok", "FashionTok", "WellnessTok",
    "CryptoTok", "CleanTok", "PlantTok", "CozyTok", "BeautyTok",
  ],
  instagram: [
    "Fitness & Lifestyle", "Travel Creators", "Food & Recipe Community", "Fashion Insiders",
    "Tech Creators", "Entrepreneurs on IG", "Photography Community", "Wellness & Mindfulness",
    "Gaming Content Creators", "Beauty & Skincare", "Home & Decor", "Parenting Community",
  ],
  facebook: [
    "Entrepreneurs & Startups", "Tech Enthusiasts Group", "Personal Finance Community",
    "Fitness & Health Hub", "Gaming Lounge", "Creative Professionals Network",
    "Remote Workers Network", "Digital Marketing Pros", "Women in Tech", "Side Hustle Nation",
  ],
  substack: [
    "The Diff readers", "Stratechery Community", "Not Boring subscribers", "Dense Discovery",
    "Lenny's Newsletter", "TLDR readers", "Morning Brew Community", "The Hustle",
    "Platformer subscribers", "The Browser", "Axios Pro readers", "Second Breakfast",
  ],
};

const TOPIC_POOL = [
  "growth hacking", "content strategy", "AI tools", "no-code", "creator economy",
  "indie making", "remote work", "digital nomad", "side hustles", "personal brand",
  "social media strategy", "newsletter growth", "audience building", "monetization",
  "viral content", "community building", "product launches", "thought leadership",
  "short-form video", "long-form content", "niche communities", "brand deals",
];

const PLATFORM_SIZE_RANGES: Record<string, [number, number]> = {
  reddit:    [50_000,  8_000_000],
  twitter:   [5_000,    500_000],
  tiktok:    [10_000, 2_000_000],
  instagram: [8_000,  1_000_000],
  facebook:  [1_000,    500_000],
  substack:  [500,      100_000],
};

const DESCRIPTIONS: Record<string, (name: string) => string> = {
  reddit:    (n) => `Subreddit ${n} — discussions, links, and posts from engaged Redditors who also follow this account.`,
  twitter:   (n) => `${n} cluster on X/Twitter — a dense network of mutuals who participate in this conversation space.`,
  tiktok:    (n) => `${n} niche on TikTok — creators and viewers who actively engage with this type of content.`,
  instagram: (n) => `${n} on Instagram — followers who engage with similar visual content and creators.`,
  facebook:  (n) => `${n} — an active Facebook group overlapping heavily with this account's follower base.`,
  substack:  (n) => `${n} — a Substack publication whose readers share strong interest overlap with this account's audience.`,
};

// ─── Generator ────────────────────────────────────────────────────────────────

export function getMockAudience(handle: string, platform: AudiencePlatform): AudienceResult {
  const normalizedHandle = handle.replace(/^@/, "").toLowerCase();
  const rng = seededRng(`audience-${normalizedHandle}-${platform}`);
  const totalAudience = randInt(5_000, 2_000_000, rng);

  const targetPlatforms =
    platform === "all"
      ? (["reddit", "twitter", "tiktok", "instagram", "facebook", "substack"] as const)
      : ([platform] as const);

  const perPlatform = platform === "all" ? 3 : 10;

  const communities: AudienceCommunity[] = [];

  for (const plt of targetPlatforms) {
    const pRng = seededRng(`audience-${normalizedHandle}-${plt}`);
    const names = [...(COMMUNITY_NAMES[plt] ?? [])].sort(() => pRng() - 0.5).slice(0, perPlatform);
    const [sizeMin, sizeMax] = PLATFORM_SIZE_RANGES[plt] ?? [1_000, 1_000_000];

    names.forEach((name, i) => {
      const overlapPct = Math.max(3, Math.round((pRng() * 55 + 8) * (1 - i * 0.035)));
      const communitySize = randInt(sizeMin, sizeMax, pRng);
      const estimated = Math.round((overlapPct / 100) * totalAudience);
      const topicCount = randInt(2, 4, pRng);
      const sharedTopics = [...TOPIC_POOL].sort(() => pRng() - 0.5).slice(0, topicCount);
      const descFn = DESCRIPTIONS[plt] ?? DESCRIPTIONS.twitter;

      communities.push({
        community_id: `${plt}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        community_name: name,
        platform: plt,
        community_size: communitySize,
        overlap_pct: overlapPct,
        estimated_overlap: estimated,
        shared_topics: sharedTopics,
        description: descFn(name),
      });
    });
  }

  communities.sort((a, b) => b.overlap_pct - a.overlap_pct);

  return {
    handle: `@${normalizedHandle}`,
    platform,
    estimated_total_audience: totalAudience,
    communities,
    analyzed_at: new Date().toISOString(),
  };
}
