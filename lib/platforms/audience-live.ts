/**
 * Live audience intelligence using Apify scrapers.
 *
 * Each platform has its own Apify actor and signal-extraction logic:
 *   - Twitter   → apify/twitter-scraper    → hashtags from tweets
 *   - Reddit    → apify/reddit-scraper     → subreddits from user posts (direct!)
 *   - TikTok    → clockworks/tiktok-scraper → hashtags from videos
 *   - Instagram → apify/instagram-scraper  → hashtags from posts
 *   - Facebook / Substack → mock (no reliable public scraper)
 *   - All       → Twitter signal mapped across all platforms
 *
 * Falls back to mock automatically on any Apify error.
 */

import { runActor } from "@/lib/apify";
import type { AudienceResult, AudiencePlatform } from "./audience";
import { getMockAudience } from "./audience";
import { seededRng, randInt } from "./mock-helpers";

// ─── Apify response shapes ────────────────────────────────────────────────────

interface ApifyTweet {
  text?: string;
  full_text?: string;
  entities?: { hashtags?: Array<{ text: string }> };
  author?: { public_metrics?: { followers_count?: number } };
  user?: { followers_count?: number };
}

interface ApifyRedditPost {
  subreddit?: string;
  title?: string;
  score?: number;
  numberOfComments?: number;
  community?: string; // some actor versions use this key
}

interface ApifyTikTokVideo {
  text?: string;
  hashtags?: Array<{ name: string }>;
  diggCount?: number;
  playCount?: number;
  authorMeta?: { fans?: number; name?: string };
}

interface ApifyInstagramPost {
  caption?: string;
  hashtags?: string[];
  likesCount?: number;
  ownersipInfo?: { followersCount?: number };
  ownerFollowersCount?: number;
}

// ─── Topic → community mapping ────────────────────────────────────────────────

interface CommunityTemplate {
  platform: string;
  name: string;
  id: string;
  size_min: number;
  size_max: number;
}

interface TopicCluster {
  keywords: string[];
  communities: CommunityTemplate[];
}

const TOPIC_CLUSTERS: TopicCluster[] = [
  {
    keywords: ["tech", "software", "coding", "developer", "programming", "engineering", "code", "devops", "backend", "frontend"],
    communities: [
      { platform: "reddit",    name: "r/technology",         id: "reddit_r_technology",           size_min: 500_000, size_max: 8_000_000 },
      { platform: "reddit",    name: "r/webdev",             id: "reddit_r_webdev",               size_min: 100_000, size_max: 1_000_000 },
      { platform: "twitter",   name: "Tech Twitter",         id: "twitter_tech_twitter",          size_min: 10_000,  size_max: 500_000   },
      { platform: "tiktok",    name: "TechTok",              id: "tiktok_techtok",                size_min: 50_000,  size_max: 2_000_000 },
      { platform: "substack",  name: "TLDR readers",         id: "substack_tldr_readers",         size_min: 50_000,  size_max: 500_000   },
    ],
  },
  {
    keywords: ["ai", "ml", "machinelearning", "llm", "openai", "gpt", "deeplearning", "artificialintelligence", "chatgpt"],
    communities: [
      { platform: "reddit",    name: "r/MachineLearning",    id: "reddit_r_machinelearning",      size_min: 200_000, size_max: 3_000_000 },
      { platform: "twitter",   name: "AI Twitter",           id: "twitter_ai_twitter",            size_min: 10_000,  size_max: 400_000   },
      { platform: "tiktok",    name: "TechTok",              id: "tiktok_techtok",                size_min: 50_000,  size_max: 2_000_000 },
      { platform: "substack",  name: "Stratechery Community",id: "substack_stratechery_community",size_min: 20_000,  size_max: 200_000   },
    ],
  },
  {
    keywords: ["startup", "entrepreneur", "founder", "saas", "venture", "vc", "fundraising", "bootstrap", "indiehacker"],
    communities: [
      { platform: "reddit",    name: "r/startups",           id: "reddit_r_startups",             size_min: 100_000, size_max: 1_500_000 },
      { platform: "reddit",    name: "r/Entrepreneur",       id: "reddit_r_entrepreneur",         size_min: 200_000, size_max: 2_000_000 },
      { platform: "twitter",   name: "Startup Twitter",      id: "twitter_startup_twitter",       size_min: 5_000,   size_max: 300_000   },
      { platform: "facebook",  name: "Entrepreneurs & Startups", id: "facebook_entrepreneurs___startups", size_min: 5_000, size_max: 200_000 },
      { platform: "substack",  name: "Not Boring subscribers", id: "substack_not_boring_subscribers", size_min: 10_000, size_max: 100_000 },
    ],
  },
  {
    keywords: ["finance", "investing", "stocks", "crypto", "bitcoin", "ethereum", "defi", "trading", "markets", "money"],
    communities: [
      { platform: "reddit",    name: "r/investing",          id: "reddit_r_investing",            size_min: 500_000, size_max: 5_000_000 },
      { platform: "reddit",    name: "r/personalfinance",    id: "reddit_r_personalfinance",      size_min: 500_000, size_max: 4_000_000 },
      { platform: "twitter",   name: "Fintech Twitter",      id: "twitter_fintech_twitter",       size_min: 5_000,   size_max: 200_000   },
      { platform: "tiktok",    name: "FinanceTok",           id: "tiktok_financetok",             size_min: 20_000,  size_max: 1_000_000 },
    ],
  },
  {
    keywords: ["fitness", "gym", "workout", "health", "nutrition", "wellness", "yoga", "running", "crossfit"],
    communities: [
      { platform: "reddit",    name: "r/Fitness",            id: "reddit_r_fitness",              size_min: 500_000, size_max: 6_000_000 },
      { platform: "tiktok",    name: "FitTok",               id: "tiktok_fittok",                 size_min: 50_000,  size_max: 2_000_000 },
      { platform: "instagram", name: "Fitness & Lifestyle",  id: "instagram_fitness___lifestyle", size_min: 10_000,  size_max: 1_000_000 },
      { platform: "facebook",  name: "Fitness & Health Hub", id: "facebook_fitness___health_hub", size_min: 1_000,   size_max: 100_000   },
    ],
  },
  {
    keywords: ["gaming", "game", "esports", "twitch", "streamer", "ps5", "xbox", "nintendo", "pcgaming"],
    communities: [
      { platform: "reddit",    name: "r/gaming",             id: "reddit_r_gaming",               size_min: 1_000_000, size_max: 8_000_000 },
      { platform: "twitter",   name: "Gaming Twitter",       id: "twitter_gaming_twitter",        size_min: 5_000,   size_max: 300_000   },
      { platform: "tiktok",    name: "GameTok",              id: "tiktok_gametok",                size_min: 30_000,  size_max: 2_000_000 },
      { platform: "instagram", name: "Gaming Content Creators", id: "instagram_gaming_content_creators", size_min: 5_000, size_max: 300_000 },
    ],
  },
  {
    keywords: ["marketing", "growth", "seo", "content", "brand", "social", "influencer", "creator", "newsletter"],
    communities: [
      { platform: "reddit",    name: "r/marketing",          id: "reddit_r_marketing",            size_min: 100_000, size_max: 1_000_000 },
      { platform: "twitter",   name: "Creator Economy",      id: "twitter_creator_economy",       size_min: 3_000,   size_max: 100_000   },
      { platform: "substack",  name: "Lenny's Newsletter",   id: "substack_lenny_s_newsletter",   size_min: 30_000,  size_max: 300_000   },
    ],
  },
  {
    keywords: ["food", "recipe", "cooking", "restaurant", "chef", "baking", "vegan", "foodie"],
    communities: [
      { platform: "tiktok",    name: "FoodTok",              id: "tiktok_foodtok",                size_min: 50_000,  size_max: 2_000_000 },
      { platform: "instagram", name: "Food & Recipe Community", id: "instagram_food___recipe_community", size_min: 10_000, size_max: 1_000_000 },
    ],
  },
  {
    keywords: ["fashion", "style", "outfit", "ootd", "beauty", "skincare", "makeup", "streetwear"],
    communities: [
      { platform: "tiktok",    name: "FashionTok",           id: "tiktok_fashiontok",             size_min: 30_000,  size_max: 2_000_000 },
      { platform: "instagram", name: "Fashion Insiders",     id: "instagram_fashion_insiders",    size_min: 10_000,  size_max: 500_000   },
      { platform: "reddit",    name: "r/femalefashionadvice",id: "reddit_r_femalefashionadvice",  size_min: 100_000, size_max: 1_000_000 },
    ],
  },
  {
    keywords: ["parenting", "mom", "dad", "kids", "family", "baby", "toddler", "pregnancy"],
    communities: [
      { platform: "tiktok",    name: "FoodTok",              id: "tiktok_foodtok",                size_min: 50_000,  size_max: 2_000_000 },
      { platform: "instagram", name: "Parenting Community",  id: "instagram_parenting_community", size_min: 5_000,   size_max: 300_000   },
      { platform: "facebook",  name: "Side Hustle Nation",   id: "facebook_side_hustle_nation",   size_min: 2_000,   size_max: 80_000    },
      { platform: "reddit",    name: "r/Parenting",          id: "reddit_r_parenting",            size_min: 100_000, size_max: 1_000_000 },
    ],
  },
];

const SHARED_TOPIC_LABELS: Record<string, string[]> = {
  tech:        ["software dev", "open source", "build in public", "side projects"],
  ai:          ["AI tools", "LLMs", "prompt engineering", "automation"],
  startup:     ["indie making", "product launches", "audience building", "fundraising"],
  finance:     ["investing", "personal finance", "side hustles", "monetization"],
  fitness:     ["wellness", "nutrition", "workout tips", "habit building"],
  gaming:      ["esports", "game reviews", "streaming", "gaming culture"],
  marketing:   ["content strategy", "growth hacking", "newsletter growth", "creator economy"],
  food:        ["recipe sharing", "food culture", "cooking tips", "local dining"],
  fashion:     ["style tips", "trend spotting", "brand collabs", "ootd"],
  parenting:   ["mom life", "toddler tips", "family content", "parenting hacks"],
};

// ─── Shared: score communities from keyword/hashtag signals ──────────────────

function scoreCommunities(
  signals: string[],
  platformFilter: string
): Array<CommunityTemplate & { score: number; clusterKey: string }> {
  const scores = new Map<string, CommunityTemplate & { score: number; clusterKey: string }>();

  for (const cluster of TOPIC_CLUSTERS) {
    const clusterKey = cluster.keywords[0];
    const matches = signals.filter((s) =>
      cluster.keywords.some((kw) => s.includes(kw) || kw.includes(s))
    );
    if (matches.length === 0) continue;

    for (const community of cluster.communities) {
      if (platformFilter !== "all" && community.platform !== platformFilter) continue;
      const existing = scores.get(community.id);
      if (existing) {
        existing.score += matches.length;
      } else {
        scores.set(community.id, { ...community, score: matches.length, clusterKey });
      }
    }
  }

  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}

function buildResult(
  handle: string,
  platform: string,
  scored: Array<CommunityTemplate & { score: number; clusterKey: string }>,
  totalAudience: number,
  limit: number
): AudienceResult {
  const rng = seededRng(`live-${handle}-${platform}`);
  const maxScore = scored[0]?.score ?? 1;

  const communities = scored.slice(0, limit).map((c, i) => {
    const overlapPct = Math.max(3, Math.round((c.score / maxScore) * 60 * (1 - i * 0.03)));
    const communitySize = randInt(c.size_min, c.size_max, rng);
    const topicLabels = SHARED_TOPIC_LABELS[c.clusterKey] ?? ["content strategy", "community building"];
    return {
      community_id: c.id,
      community_name: c.name,
      platform: c.platform,
      community_size: communitySize,
      overlap_pct: overlapPct,
      estimated_overlap: Math.round((overlapPct / 100) * totalAudience),
      shared_topics: topicLabels.slice(0, randInt(2, 4, rng)),
      description: `Community where @${handle}'s audience is highly active based on shared topic signals.`,
    };
  });

  return {
    handle: `@${handle}`,
    platform,
    estimated_total_audience: totalAudience,
    communities,
    analyzed_at: new Date().toISOString(),
  };
}

// ─── Twitter scraper ──────────────────────────────────────────────────────────

async function scrapeTwitter(handle: string, platformFilter: string): Promise<AudienceResult> {
  const tweets = await runActor<ApifyTweet>("apify/twitter-scraper", {
    searchTerms: [`from:${handle}`],
    maxItems: 100,
    queryType: "Latest",
  }, 90);

  if (tweets.length === 0) throw new Error("No tweets found");

  const signals: string[] = [];
  let followerCount = 0;

  for (const tweet of tweets) {
    const text = tweet.full_text ?? tweet.text ?? "";
    const tags = tweet.entities?.hashtags?.map((h) => h.text.toLowerCase()) ?? [];
    const inline = (text.match(/#(\w+)/g) ?? []).map((t) => t.slice(1).toLowerCase());
    signals.push(...tags, ...inline);
    if (!followerCount) {
      followerCount = tweet.author?.public_metrics?.followers_count ?? tweet.user?.followers_count ?? 0;
    }
  }

  if (signals.length === 0) throw new Error("No hashtag signals found");

  const scored = scoreCommunities(signals, platformFilter);
  return buildResult(handle, platformFilter, scored, followerCount || 50_000, platformFilter === "all" ? 18 : 10);
}

// ─── Reddit scraper ───────────────────────────────────────────────────────────
// Reddit gives us DIRECT subreddit signals from the user's actual posts.

async function scrapeReddit(handle: string): Promise<AudienceResult> {
  const posts = await runActor<ApifyRedditPost>("apify/reddit-scraper", {
    startUrls: [{ url: `https://www.reddit.com/user/${handle}/submitted/` }],
    maxItems: 50,
  }, 90);

  if (posts.length === 0) throw new Error("No Reddit posts found");

  // Count posts per subreddit — direct community membership signal
  const subredditCounts: Record<string, number> = {};
  const titleSignals: string[] = [];

  for (const post of posts) {
    const sub = (post.subreddit ?? post.community ?? "").toLowerCase().replace(/^r\//, "");
    if (sub) subredditCounts[sub] = (subredditCounts[sub] ?? 0) + 1;
    if (post.title) titleSignals.push(...post.title.toLowerCase().split(/\W+/));
  }

  // Build communities from subreddit counts (these are real)
  const directCommunities = Object.entries(subredditCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([sub, count], i) => {
      const total = posts.length;
      const overlapPct = Math.round((count / total) * 70);
      return {
        community_id: `reddit_r_${sub}`,
        community_name: `r/${sub}`,
        platform: "reddit",
        community_size: randInt(10_000, 2_000_000, seededRng(`reddit-${handle}-${sub}`)),
        overlap_pct: Math.max(3, overlapPct),
        estimated_overlap: Math.round((overlapPct / 100) * 50_000),
        shared_topics: ["community discussion", "content sharing"],
        description: `r/${sub} — a subreddit where u/${handle} actively posts content.`,
      };
    });

  // Also score cross-platform communities from title keywords
  const scored = scoreCommunities(
    [...titleSignals, ...Object.keys(subredditCounts)],
    "all"
  ).filter((c) => c.platform !== "reddit"); // avoid duplicating reddit results

  const rng = seededRng(`reddit-live-${handle}`);
  const crossPlatform = scored.slice(0, 6).map((c, i) => {
    const overlapPct = Math.max(3, Math.round(30 * (1 - i * 0.1)));
    return {
      community_id: c.id,
      community_name: c.name,
      platform: c.platform,
      community_size: randInt(c.size_min, c.size_max, rng),
      overlap_pct: overlapPct,
      estimated_overlap: Math.round((overlapPct / 100) * 50_000),
      shared_topics: (SHARED_TOPIC_LABELS[c.clusterKey] ?? ["content strategy"]).slice(0, 2),
      description: `Community where u/${handle}'s Reddit audience is also active.`,
    };
  });

  const communities = [...directCommunities, ...crossPlatform]
    .sort((a, b) => b.overlap_pct - a.overlap_pct);

  return {
    handle: `u/${handle}`,
    platform: "reddit",
    estimated_total_audience: 50_000,
    communities,
    analyzed_at: new Date().toISOString(),
  };
}

// ─── TikTok scraper ───────────────────────────────────────────────────────────

async function scrapeTikTok(handle: string): Promise<AudienceResult> {
  const videos = await runActor<ApifyTikTokVideo>("clockworks/tiktok-scraper", {
    profiles: [`https://www.tiktok.com/@${handle}`],
    resultsPerPage: 30,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
  }, 90);

  if (videos.length === 0) throw new Error("No TikTok videos found");

  const signals: string[] = [];
  let followerCount = 0;

  for (const video of videos) {
    const tags = video.hashtags?.map((h) => h.name.toLowerCase()) ?? [];
    const inline = (video.text ?? "").match(/#(\w+)/g)?.map((t) => t.slice(1).toLowerCase()) ?? [];
    signals.push(...tags, ...inline);
    if (!followerCount) followerCount = video.authorMeta?.fans ?? 0;
  }

  if (signals.length === 0) throw new Error("No hashtag signals found");

  const scored = scoreCommunities(signals, "all");
  return buildResult(handle, "tiktok", scored, followerCount || 10_000, 10);
}

// ─── Instagram scraper ────────────────────────────────────────────────────────

async function scrapeInstagram(handle: string): Promise<AudienceResult> {
  const posts = await runActor<ApifyInstagramPost>("apify/instagram-scraper", {
    usernames: [handle],
    resultsLimit: 30,
  }, 90);

  if (posts.length === 0) throw new Error("No Instagram posts found");

  const signals: string[] = [];
  let followerCount = 0;

  for (const post of posts) {
    if (post.hashtags) signals.push(...post.hashtags.map((h) => h.toLowerCase()));
    const inline = (post.caption ?? "").match(/#(\w+)/g)?.map((t) => t.slice(1).toLowerCase()) ?? [];
    signals.push(...inline);
    if (!followerCount) followerCount = post.ownerFollowersCount ?? 0;
  }

  if (signals.length === 0) throw new Error("No hashtag signals found");

  const scored = scoreCommunities(signals, "all");
  return buildResult(handle, "instagram", scored, followerCount || 10_000, 10);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getLiveAudience(
  handle: string,
  platform: AudiencePlatform
): Promise<AudienceResult> {
  const normalized = handle.replace(/^[@u\/]+/, "").toLowerCase();

  try {
    switch (platform) {
      case "reddit":
        return await scrapeReddit(normalized);
      case "tiktok":
        return await scrapeTikTok(normalized);
      case "instagram":
        return await scrapeInstagram(normalized);
      case "twitter":
      case "all":
        return await scrapeTwitter(normalized, platform);
      default:
        // Facebook / Substack — no reliable public scraper, use mock
        console.warn(`[audience-live] No live scraper for ${platform}, using mock`);
        return getMockAudience(normalized, platform);
    }
  } catch (err) {
    console.warn(`[audience-live] ${platform} scrape failed for @${normalized}, using mock:`, err);
    return getMockAudience(normalized, platform);
  }
}
