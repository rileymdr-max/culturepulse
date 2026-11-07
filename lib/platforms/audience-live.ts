/**
 * Live audience intelligence using Apify scrapers.
 *
 * Each platform scrapes BRAND MENTIONS (what the audience says about the brand),
 * not the brand's own posts — this gives us audience identity signals, not brand voice.
 *
 *   - Twitter   → apify/twitter-scraper    → tweets mentioning @handle
 *   - Reddit    → apify/reddit-scraper     → subreddits where handle is mentioned
 *   - TikTok    → clockworks/tiktok-scraper → videos tagged #handle
 *   - Instagram → apify/instagram-scraper  → posts tagged #handle
 *   - Facebook / Substack → mock (no reliable public scraper)
 *   - All       → all four scrapers in parallel, merged
 *
 * Falls back to mock automatically on any Apify error.
 */

import { runActor } from "@/lib/apify";
import type { AudienceResult, AudiencePlatform, HandleMap } from "./audience";
import { getMockAudience, handleFor } from "./audience";
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

interface ApifyYouTubeVideo {
  title?: string;
  description?: string;
  hashtags?: string[];
  viewCount?: number;
  likeCount?: number;
  channelName?: string;
  numberOfSubscribers?: number;
}

interface ApifyPinResult {
  title?: string;
  description?: string;
  boardName?: string;
  boardCategories?: string[];
  saves?: number;
  repinCount?: number;
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
  // Search for tweets mentioning @handle — audience talking about the brand, not brand's own tweets
  const tweets = await runActor<ApifyTweet>("apify/twitter-scraper", {
    searchTerms: [`@${handle}`],
    maxItems: 100,
    queryType: "Latest",
  }, 45);

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
  // Search Reddit for posts MENTIONING the brand — same approach as Twitter.
  // The subreddits where those posts appear tell us where the brand's audience lives.
  const posts = await runActor<ApifyRedditPost>("apify/reddit-scraper", {
    startUrls: [{ url: `https://www.reddit.com/search/?q=${encodeURIComponent(handle)}&type=link&sort=relevance` }],
    maxItems: 100,
  }, 45);

  if (posts.length === 0) throw new Error("No Reddit mentions found");

  // Count how many brand-mention posts appear in each subreddit
  const subredditCounts: Record<string, number> = {};
  const titleSignals: string[] = [];

  for (const post of posts) {
    const sub = (post.subreddit ?? post.community ?? "").toLowerCase().replace(/^r\//, "");
    if (sub) subredditCounts[sub] = (subredditCounts[sub] ?? 0) + 1;
    if (post.title) titleSignals.push(...post.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  }

  const totalPosts = posts.length;
  const rng = seededRng(`reddit-live-${handle}`);

  // Each subreddit that mentions the brand is an audience community
  const directCommunities = Object.entries(subredditCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([sub, count]) => {
      const overlapPct = Math.max(4, Math.round((count / totalPosts) * 75));
      return {
        community_id: `reddit_r_${sub}`,
        community_name: `r/${sub}`,
        platform: "reddit",
        community_size: randInt(10_000, 2_000_000, seededRng(`reddit-${handle}-${sub}`)),
        overlap_pct: overlapPct,
        estimated_overlap: Math.round((overlapPct / 100) * totalPosts * 1_000),
        shared_topics: ["brand discussion", "community recommendations"],
        description: `r/${sub} — subreddit where people are actively talking about ${handle}.`,
      };
    });

  // Use title keywords to infer additional cross-platform topic clusters
  const scored = scoreCommunities(
    [...titleSignals, ...Object.keys(subredditCounts)],
    "all"
  ).filter((c) => c.platform !== "reddit");

  const crossPlatform = scored.slice(0, 4).map((c, i) => {
    const overlapPct = Math.max(3, Math.round(28 * (1 - i * 0.12)));
    return {
      community_id: c.id,
      community_name: c.name,
      platform: c.platform,
      community_size: randInt(c.size_min, c.size_max, rng),
      overlap_pct: overlapPct,
      estimated_overlap: Math.round((overlapPct / 100) * totalPosts * 1_000),
      shared_topics: (SHARED_TOPIC_LABELS[c.clusterKey] ?? ["content strategy"]).slice(0, 2),
      description: `Community active in the same topics as ${handle}'s Reddit audience.`,
    };
  });

  const communities = [...directCommunities, ...crossPlatform]
    .sort((a, b) => b.overlap_pct - a.overlap_pct);

  return {
    handle,
    platform: "reddit",
    estimated_total_audience: totalPosts * 1_000,
    communities,
    analyzed_at: new Date().toISOString(),
  };
}

// ─── TikTok scraper ───────────────────────────────────────────────────────────

async function scrapeTikTok(handle: string): Promise<AudienceResult> {
  // Primary: videos tagged #handle — best signal for well-known brands
  let videos: ApifyTikTokVideo[] = [];
  try {
    videos = await runActor<ApifyTikTokVideo>("clockworks/tiktok-scraper", {
      hashtags: [handle],
      resultsPerPage: 30,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
    }, 45);
  } catch {
    // ignore — keyword search below acts as fallback
  }

  // Fallback: keyword search for the brand name in captions/titles.
  // Catches niche brands where #handle hashtag has low usage.
  if (videos.length < 10) {
    try {
      const keywordVideos = await runActor<ApifyTikTokVideo>("clockworks/tiktok-scraper", {
        searchQueries: [handle],
        resultsPerPage: 30,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
      }, 45);
      // Merge, deduplicate by text content
      const seen = new Set(videos.map((v) => v.text ?? ""));
      for (const v of keywordVideos) {
        if (!seen.has(v.text ?? "")) { videos.push(v); seen.add(v.text ?? ""); }
      }
    } catch {
      // ignore
    }
  }

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
  // Search posts tagged #handle — audience posting about the brand
  const posts = await runActor<ApifyInstagramPost>("apify/instagram-scraper", {
    hashtags: [handle],
    resultsLimit: 30,
  }, 45);

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

// ─── YouTube scraper ──────────────────────────────────────────────────────────
// Searches for videos mentioning the brand — YouTube comments/titles reveal
// which subculture communities are talking about them.

async function scrapeYouTube(handle: string): Promise<AudienceResult> {
  const videos = await runActor<ApifyYouTubeVideo>("streamers/youtube-scraper", {
    searchQueries: [handle],
    maxResults: 20,
    sortingOrder: "relevance",
  }, 45);

  if (videos.length === 0) throw new Error("No YouTube videos found");

  const signals: string[] = [];
  let subscriberCount = 0;

  for (const video of videos) {
    const tags = video.hashtags?.map((h) => h.toLowerCase().replace(/^#/, "")) ?? [];
    const titleWords = (video.title ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const descWords = (video.description ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 4).slice(0, 20);
    signals.push(...tags, ...titleWords, ...descWords);
    if (!subscriberCount) subscriberCount = video.numberOfSubscribers ?? 0;
  }

  if (signals.length === 0) throw new Error("No signals from YouTube videos");

  const scored = scoreCommunities(signals, "all");
  return buildResult(handle, "youtube", scored, subscriberCount || 25_000, 10);
}

// ─── Pinterest scraper ────────────────────────────────────────────────────────
// Pinterest board names are direct subculture signals — "Quiet Luxury",
// "Dark Academia", "Van Life" etc. map 1:1 to cultural identity clusters.

async function scrapePinterest(handle: string): Promise<AudienceResult> {
  const pins = await runActor<ApifyPinResult>("silentflow/pinterest-scraper-ppr", {
    searchQueries: [handle],
    maxItems: 30,
    includeDetails: false,
  }, 45);

  if (pins.length === 0) throw new Error("No Pinterest pins found");

  const signals: string[] = [];

  for (const pin of pins) {
    // Board names are the richest signal on Pinterest
    const boardWords = (pin.boardName ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const titleWords = (pin.title ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const descWords = (pin.description ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 4).slice(0, 10);
    const cats = (pin.boardCategories ?? []).map((c) => c.toLowerCase());
    signals.push(...boardWords, ...titleWords, ...descWords, ...cats);
  }

  if (signals.length === 0) throw new Error("No signals from Pinterest pins");

  const scored = scoreCommunities(signals, "all");
  return buildResult(handle, "pinterest", scored, 10_000, 10);
}

// ─── All-platforms scraper ────────────────────────────────────────────────────
// Runs all six scrapers in parallel, merges community lists, deduplicates.

async function scrapeAll(handles: HandleMap, excluded: Set<string>): Promise<AudienceResult> {
  const scrapers: Promise<AudienceResult>[] = [
    excluded.has("twitter")   ? Promise.reject("excluded") : scrapeTwitter(handleFor(handles, "twitter"), "all"),
    excluded.has("tiktok")    ? Promise.reject("excluded") : scrapeTikTok(handleFor(handles, "tiktok")),
    excluded.has("reddit")    ? Promise.reject("excluded") : scrapeReddit(handleFor(handles, "reddit")),
    excluded.has("instagram") ? Promise.reject("excluded") : scrapeInstagram(handleFor(handles, "instagram")),
    excluded.has("youtube")   ? Promise.reject("excluded") : scrapeYouTube(handleFor(handles, "youtube")),
    excluded.has("pinterest") ? Promise.reject("excluded") : scrapePinterest(handleFor(handles, "pinterest")),
  ];

  const [twitterResult, tiktokResult, redditResult, instagramResult, youtubeResult, pinterestResult] =
    await Promise.allSettled(scrapers);

  const results: AudienceResult[] = [];
  if (twitterResult.status === "fulfilled") results.push(twitterResult.value);
  if (tiktokResult.status === "fulfilled") results.push(tiktokResult.value);
  if (redditResult.status === "fulfilled") results.push(redditResult.value);
  if (instagramResult.status === "fulfilled") results.push(instagramResult.value);
  if (youtubeResult.status === "fulfilled") results.push(youtubeResult.value);
  if (pinterestResult.status === "fulfilled") results.push(pinterestResult.value);

  // If both failed, throw so the caller falls back to mock
  if (results.length === 0) throw new Error("All platform scrapers failed");

  // Merge communities — deduplicate by community_id, keep highest overlap
  const communityMap = new Map<string, AudienceResult["communities"][number]>();
  for (const result of results) {
    for (const c of result.communities) {
      const existing = communityMap.get(c.community_id);
      if (!existing || c.overlap_pct > existing.overlap_pct) {
        communityMap.set(c.community_id, c);
      }
    }
  }

  // Cap each platform at 4 communities and interleave (round-robin) so no single
  // platform dominates the signal fed to Claude — Twitter in particular can flood
  // results given its historically large dataset even as actual usage has declined.
  const byPlatform = new Map<string, typeof communityMap extends Map<string, infer V> ? V[] : never>();
  for (const c of communityMap.values()) {
    const bucket = byPlatform.get(c.platform) ?? [];
    bucket.push(c);
    byPlatform.set(c.platform, bucket);
  }
  for (const [platform, bucket] of byPlatform) {
    byPlatform.set(platform, bucket.sort((a, b) => b.overlap_pct - a.overlap_pct).slice(0, 4));
  }

  // Round-robin across platforms so the merged list is balanced
  const platformQueues = Array.from(byPlatform.values());
  const merged: (typeof communityMap extends Map<string, infer V> ? V : never)[] = [];
  let i = 0;
  while (merged.length < 18) {
    let added = false;
    for (const queue of platformQueues) {
      if (queue[i]) { merged.push(queue[i]); added = true; }
    }
    if (!added) break;
    i++;
  }

  const totalAudience = Math.max(...results.map((r) => r.estimated_total_audience));

  return {
    handle: `@${handles.default}`,
    platform: "all",
    estimated_total_audience: totalAudience,
    communities: merged,
    analyzed_at: new Date().toISOString(),
  };
}

// ─── Niche trending content ───────────────────────────────────────────────────
// Scrape trending content for a specific hashtag/subculture for the Signal Board.

export interface TrendingItem {
  platform: string;
  text: string;
  author: string;
  engagement: number;
  tags: string[];
}

export async function getTrendingNicheContent(
  hashtag: string,
  platform: "tiktok" | "twitter" | "instagram" | "all" = "tiktok"
): Promise<TrendingItem[]> {
  const tag = hashtag.replace(/^#/, "");
  const items: TrendingItem[] = [];

  try {
    if (platform === "tiktok" || platform === "all") {
      const videos = await runActor<ApifyTikTokVideo>("clockworks/tiktok-scraper", {
        hashtags: [tag],
        resultsPerPage: 20,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
      }, 45);
      for (const v of videos) {
        items.push({
          platform: "tiktok",
          text: v.text ?? "",
          author: v.authorMeta?.name ?? "unknown",
          engagement: (v.diggCount ?? 0) + (v.playCount ?? 0) / 100,
          tags: v.hashtags?.map((h) => h.name) ?? [],
        });
      }
    }

    if (platform === "twitter" || platform === "all") {
      const tweets = await runActor<ApifyTweet>("apify/twitter-scraper", {
        searchTerms: [`#${tag}`],
        maxItems: 20,
        queryType: "Top",
      }, 45);
      for (const t of tweets) {
        items.push({
          platform: "twitter",
          text: t.full_text ?? t.text ?? "",
          author: (t.author as { userName?: string } | undefined)?.userName ?? "unknown",
          engagement: t.author?.public_metrics?.followers_count ?? 0,
          tags: t.entities?.hashtags?.map((h) => h.text) ?? [],
        });
      }
    }
  } catch (err) {
    console.warn(`[audience-live] getTrendingNicheContent failed for #${tag}:`, err);
  }

  return items.sort((a, b) => b.engagement - a.engagement);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getLiveAudience(
  handles: HandleMap,
  platform: AudiencePlatform,
  excludedPlatforms: string[] = []
): Promise<AudienceResult> {
  const normalized = handles.default.replace(/^[@u\/]+/, "").toLowerCase();
  const normedHandles: HandleMap = {
    ...handles,
    default: normalized,
  };
  const excluded = new Set(excludedPlatforms);

  try {
    switch (platform) {
      case "reddit":
        return await scrapeReddit(handleFor(normedHandles, "reddit"));
      case "tiktok":
        return await scrapeTikTok(handleFor(normedHandles, "tiktok"));
      case "instagram":
        return await scrapeInstagram(handleFor(normedHandles, "instagram"));
      case "youtube":
        return await scrapeYouTube(handleFor(normedHandles, "youtube"));
      case "pinterest":
        return await scrapePinterest(handleFor(normedHandles, "pinterest"));
      case "twitter":
        return await scrapeTwitter(handleFor(normedHandles, "twitter"), "twitter");
      case "all":
        return await scrapeAll(normedHandles, excluded);
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
