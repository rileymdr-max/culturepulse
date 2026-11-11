/**
 * Subculture signal enricher.
 *
 * Scrapes Reddit, TikTok, and Twitter in parallel using Apify actors,
 * then fetches real subreddit subscriber counts via the Reddit public API.
 * Returns structured SubcultureSignalData with per-platform source labels.
 *
 * All platforms are best-effort: a failure on one does not fail the others.
 */

import { runActor } from "@/lib/apify";
import type {
  SubcultureSignalData,
  RedditSignal,
  RedditPost,
  RedditCommunity,
  TikTokSignal,
  TikTokVideo,
  TwitterSignal,
  TwitterPost,
  YouTubeSignal,
  YouTubeVideo,
  InstagramSignal,
  InstagramPost,
  TrendsSignal,
} from "@/lib/types/subculture";

// ─── Keyword extraction ───────────────────────────────────────────────────────
// When users type full sentences like "sourdough bakers who document their
// process online", strip filler words so scrapers get useful short queries.

const STOP = new Set([
  "who","what","when","where","why","how","is","are","was","were",
  "the","a","an","and","or","but","in","on","at","to","for","of",
  "with","by","from","their","they","that","this","which","do","does",
  "can","will","would","could","should","may","might","online","process",
  "about","into","over","after","above","below","out","off","up","down",
  "not","also","than","then","so","if","very","just","as","has","have",
  "had","been","being","be","it","its","them","these","those","my","your",
  "our","his","her","document","make","making","made","use","using","used",
  "people","community","group","culture","content","platform","post",
]);

function extractKeyTerms(query: string): { primary: string; hashtags: string[] } {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  const primary = words.slice(0, 3).join(" ") || query.split(/\s+/).slice(0, 3).join(" ");
  // Short hashtags: individual words + first-two-words concatenated
  const hashtags = [
    ...words.slice(0, 4).map((w) => `#${w}`),
    ...(words.length >= 2 ? [`#${words[0]}${words[1]}`] : []),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);

  return { primary, hashtags };
}

// ─── Reddit ───────────────────────────────────────────────────────────────────
// Uses Apify's harshmaur/reddit-scraper. The official apify/reddit-scraper (and
// several others) crawl 0 pages for search queries as of Nov 2026, and some
// return posts with score/comments zeroed; this one returns full vote data and
// subreddit sizes. Billed per post saved (~$0.0018) plus a small start fee.

interface ApifyRedditPost {
  title?: string;
  parsedCommunityName?: string;
  communityName?: string; // "r/name"
  score?: number;
  commentsCount?: number;
  postUrl?: string;
  subredditSubscribers?: number;
}

async function enrichReddit(query: string): Promise<RedditSignal | undefined> {
  try {
    const { primary } = extractKeyTerms(query);
    const posts = await runActor<ApifyRedditPost>("harshmaur/reddit-scraper", {
      searchTerms: [primary],
      searchPosts: true,
      searchComments: false,
      searchCommunities: false,
      crawlCommentsPerPost: false,
      includeNSFW: false,
      searchSort: "relevance",
      searchTime: "year",
      maxPostsCount: 25,
    }, 75, 512);

    if (!posts.length) {
      console.warn(`[enricher] Reddit returned no posts for "${primary}"`);
      return undefined;
    }

    const subOf = (p: ApifyRedditPost) =>
      (p.parsedCommunityName ?? p.communityName ?? "").replace(/^r\//, "").trim();

    // Group by subreddit
    const subredditMap = new Map<string, { posts: ApifyRedditPost[]; engagement: number; subscribers?: number }>();
    for (const p of posts) {
      const sub = subOf(p);
      if (!sub) continue;
      const entry = subredditMap.get(sub) ?? { posts: [], engagement: 0 };
      entry.posts.push(p);
      entry.engagement += (p.score ?? 0) + (p.commentsCount ?? 0) * 3;
      entry.subscribers ??= p.subredditSubscribers ?? undefined;
      subredditMap.set(sub, entry);
    }

    const communities: RedditCommunity[] = Array.from(subredditMap.entries())
      .sort(([, a], [, b]) => b.engagement - a.engagement)
      .slice(0, 5)
      .map(([sub, data]) => ({
        subreddit: sub,
        posts_found: data.posts.length,
        engagement: data.engagement,
        subscriber_count: data.subscribers,
      }));

    const topPosts: RedditPost[] = posts
      .filter((p) => p.title && p.postUrl)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10)
      .map((p) => ({
        title: p.title!,
        url: p.postUrl!,
        subreddit: subOf(p) || "unknown",
        score: p.score ?? 0,
        comments: p.commentsCount ?? 0,
      }));

    return {
      communities,
      top_posts: topPosts,
      total_posts_found: posts.length,
      scraped_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[enricher] Reddit scrape failed:", err);
    return undefined;
  }
}

// ─── TikTok ───────────────────────────────────────────────────────────────────

interface ApifyTikTokVideo {
  text?: string;
  webVideoUrl?: string;
  diggCount?: number;
  playCount?: number;
  commentCount?: number;
  authorMeta?: { name?: string; nickName?: string; fans?: number };
  hashtags?: Array<{ name?: string }>;
}

async function enrichTikTok(query: string): Promise<TikTokSignal | undefined> {
  try {
    const { primary } = extractKeyTerms(query);
    // Single search query — multiple queries × 25 results blows past the 90s budget
    const videos = await runActor<ApifyTikTokVideo>("clockworks/tiktok-scraper", {
      searchQueries: [primary],
      resultsPerPage: 15,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    }, 90, 1024); // 1 GB = 4× the CPU of the 256 MB default; ~47s instead of timing out at 90s

    if (!videos.length) return undefined;

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = videos.filter((v) => {
      const url = v.webVideoUrl ?? "";
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });

    // Extract hashtags from all videos
    const hashtagCounts = new Map<string, number>();
    for (const v of unique) {
      for (const tag of v.hashtags ?? []) {
        const name = tag.name?.toLowerCase();
        if (name) hashtagCounts.set(name, (hashtagCounts.get(name) ?? 0) + 1);
      }
    }
    const topHashtags = Array.from(hashtagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([tag]) => `#${tag}`);

    const sorted = unique.sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));
    const topVideos: TikTokVideo[] = sorted.slice(0, 8).map((v) => ({
      caption: (v.text ?? "").slice(0, 150),
      url: v.webVideoUrl ?? "",
      views: v.playCount ?? 0,
      likes: v.diggCount ?? 0,
      creator: v.authorMeta?.nickName ?? v.authorMeta?.name ?? "unknown",
      creator_followers: v.authorMeta?.fans,
    }));

    const totalViews = unique.reduce((s, v) => s + (v.playCount ?? 0), 0);

    return {
      videos_found: unique.length,
      top_videos: topVideos,
      top_hashtags: topHashtags,
      total_views: totalViews,
      scraped_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[enricher] TikTok scrape failed:", err);
    return undefined;
  }
}

// ─── Twitter/X ────────────────────────────────────────────────────────────────

interface ApifyTweet {
  text?: string;
  fullText?: string;
  url?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  tweetBy?: { userName?: string; displayName?: string };
}

async function enrichTwitter(query: string): Promise<TwitterSignal | undefined> {
  try {
    const { primary } = extractKeyTerms(query);
    const tweets = await runActor<ApifyTweet>("apidojo/tweet-scraper", {
      searchTerms: [primary],
      maxItems: 30,
      sort: "Latest",
      tweetLanguage: "en",
    }, 50);

    if (!tweets.length) return undefined;

    const topTweets: TwitterPost[] = tweets
      .sort((a, b) => {
        const eA = (a.likeCount ?? 0) + (a.retweetCount ?? 0) * 2;
        const eB = (b.likeCount ?? 0) + (b.retweetCount ?? 0) * 2;
        return eB - eA;
      })
      .slice(0, 8)
      .map((t) => ({
        text: (t.fullText ?? t.text ?? "").slice(0, 200),
        url: t.url ?? "",
        engagement: (t.likeCount ?? 0) + (t.retweetCount ?? 0) * 2 + (t.replyCount ?? 0),
        author: t.tweetBy?.userName,
      }));

    const totalEngagement = tweets.reduce(
      (s, t) => s + (t.likeCount ?? 0) + (t.retweetCount ?? 0) * 2 + (t.replyCount ?? 0),
      0
    );

    return {
      tweets_found: tweets.length,
      top_tweets: topTweets,
      total_engagement: totalEngagement,
      scraped_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[enricher] Twitter scrape failed:", err);
    return undefined;
  }
}

// ─── YouTube ──────────────────────────────────────────────────────────────────

interface ApifyYouTubeVideo {
  title?: string;
  url?: string;
  viewCount?: number;
  likes?: number;
  channelName?: string;
  numberOfSubscribers?: number;
}

async function enrichYouTube(query: string): Promise<YouTubeSignal | undefined> {
  try {
    const { primary } = extractKeyTerms(query);
    const videos = await runActor<ApifyYouTubeVideo>("streamers/youtube-scraper", {
      searchQueries: [primary],
      maxResults: 10,
      sortingOrder: "views",
    }, 45);

    if (!videos.length) return undefined;

    const topVideos: YouTubeVideo[] = videos
      .filter((v) => v.title && v.url)
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, 8)
      .map((v) => ({
        title: v.title!,
        url: v.url!,
        views: v.viewCount ?? 0,
        likes: v.likes ?? 0,
        channel: v.channelName ?? "unknown",
        channel_subscribers: v.numberOfSubscribers,
      }));

    const totalViews = videos.reduce((s, v) => s + (v.viewCount ?? 0), 0);

    return {
      videos_found: videos.length,
      top_videos: topVideos,
      total_views: totalViews,
      scraped_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[enricher] YouTube scrape failed:", err);
    return undefined;
  }
}

// ─── Instagram ────────────────────────────────────────────────────────────────

interface ApifyInstagramPost {
  caption?: string;
  url?: string;
  likesCount?: number;
  commentsCount?: number;
  ownerUsername?: string;
  hashtags?: string[];
  timestamp?: string;
}

async function enrichInstagram(query: string): Promise<InstagramSignal | undefined> {
  try {
    const { primary } = extractKeyTerms(query);
    // Hashtag search. The first word alone ("#home" for "home coffee") pulls
    // unrelated posts, so try the first two words joined ("#homecoffee") and
    // only fall back to the single word if that tag has nothing recent.
    // Only posts from the last 7 days count, so each run measures current
    // activity instead of re-reading the same evergreen top posts.
    const words = primary.toLowerCase().split(" ").filter(Boolean);
    const tags = [words.slice(0, 2).join(""), words[0]].filter(
      (t, i, a): t is string => Boolean(t) && a.indexOf(t) === i
    );
    const scrapeTag = (tag: string) =>
      runActor<ApifyInstagramPost>("apify/instagram-scraper", {
        resultsType: "posts",
        directUrls: [`https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`],
        resultsLimit: 20,
        onlyPostsNewerThan: "7 days",
      }, 60);

    let posts: ApifyInstagramPost[] = [];
    for (const tag of tags) {
      posts = await scrapeTag(tag);
      if (posts.length) break;
    }
    if (!posts.length) {
      console.warn(`[enricher] Instagram found no recent posts for ${tags.map((t) => "#" + t).join(" or ")}`);
      return undefined;
    }

    const topPosts: InstagramPost[] = posts
      .filter((p) => p.url)
      .sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0))
      .slice(0, 8)
      .map((p) => ({
        caption: (p.caption ?? "").slice(0, 150),
        url: p.url!,
        likes: Math.max(0, p.likesCount ?? 0), // -1 means the owner hid likes
        comments: Math.max(0, p.commentsCount ?? 0),
        owner: p.ownerUsername,
      }));

    // Extract hashtags from captions
    const hashtagCounts = new Map<string, number>();
    for (const p of posts) {
      const tags = p.hashtags ?? [];
      const captionTags = (p.caption ?? "").match(/#\w+/g)?.map((t) => t.toLowerCase()) ?? [];
      for (const tag of [...tags.map((t) => t.toLowerCase()), ...captionTags]) {
        const clean = tag.replace(/^#/, "");
        if (clean) hashtagCounts.set(clean, (hashtagCounts.get(clean) ?? 0) + 1);
      }
    }
    const topHashtags = Array.from(hashtagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([tag]) => `#${tag}`);

    const totalLikes = posts.reduce((s, p) => s + Math.max(0, p.likesCount ?? 0), 0);

    // Posting rate: the newest posts on a tag are minutes old with ~0 likes, so
    // likes don't measure activity. How fast new posts arrive does: N posts
    // spanning T hours ≈ N / T × 24 posts a day.
    const times = posts
      .map((p) => (p.timestamp ? Date.parse(p.timestamp) : NaN))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => b - a);
    let postsPerDay: number | undefined;
    if (times.length >= 2) {
      const spanHours = Math.max((times[0] - times[times.length - 1]) / 3_600_000, 1 / 60);
      postsPerDay = Math.round(((times.length - 1) / spanHours) * 24);
    }

    return {
      posts_found: posts.length,
      top_posts: topPosts,
      top_hashtags: topHashtags,
      total_likes: totalLikes,
      posts_per_day: postsPerDay,
      scraped_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[enricher] Instagram scrape failed:", err);
    return undefined;
  }
}

// ─── Google Trends ────────────────────────────────────────────────────────────
// Uses the unofficial Google Trends explore + widgetdata APIs.
// Returns current interest score (0–100), trend direction, and related queries.

// Google blocks direct calls to its unofficial Trends API (HTTP 429, even from a
// home connection), so this goes through Apify's official Google Trends actor,
// which uses residential proxies. ~$0.005 per search term, ~55 s per run.
interface ApifyTrendsItem {
  interestOverTime_timelineData?: Array<{ value?: number[]; isPartial?: boolean }>;
  relatedQueries_top?: Array<{ query?: string }>;
}

async function enrichTrends(query: string): Promise<TrendsSignal | undefined> {
  try {
    const { primary } = extractKeyTerms(query);
    // timeRange omitted = past 12 months (weekly points)
    const [item] = await runActor<ApifyTrendsItem>("apify/google-trends-scraper", {
      searchTerms: [primary],
      isMultiple: false,
      maxItems: 1,
    }, 75);

    // Skip the current, partial week: it always reads low.
    const values = (item?.interestOverTime_timelineData ?? [])
      .filter((p) => !p.isPartial)
      .map((p) => p.value?.[0] ?? 0)
      .filter((v) => v > 0);
    if (!values.length) {
      console.warn(`[enricher] Google Trends returned no interest data for "${primary}"`);
      return undefined;
    }

    const currentScore = values[values.length - 1] ?? 0;
    const recentAvg = values.slice(-4).reduce((a, b) => a + b, 0) / Math.min(4, values.length);
    const earlyAvg = values.slice(0, 4).reduce((a, b) => a + b, 0) / Math.min(4, values.length);
    const trend: TrendsSignal["trend"] =
      recentAvg > earlyAvg * 1.15 ? "rising" :
      recentAvg < earlyAvg * 0.85 ? "declining" : "stable";

    const relatedQueries = (item?.relatedQueries_top ?? [])
      .map((r) => r.query)
      .filter((q): q is string => !!q)
      .slice(0, 10);

    return {
      interest_score: currentScore,
      trend,
      related_queries: relatedQueries,
      scraped_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[enricher] Google Trends failed:", err);
    return undefined;
  }
}

// ─── Main enricher ────────────────────────────────────────────────────────────

export type SignalPlatform = "reddit" | "tiktok" | "twitter" | "youtube" | "instagram" | "trends";

/**
 * Scrapes live signals for a query. Pass `platforms` to scrape only those
 * sources (e.g. monitors only store reddit + twitter, so skipping the slower
 * TikTok/Instagram actors saves up to ~90s per run). Omit it to scrape all.
 */
export async function enrichSubcultureWithSignals(
  query: string,
  platforms?: readonly string[]
): Promise<SubcultureSignalData> {
  const want = (p: SignalPlatform) => !platforms || platforms.includes(p);
  const skip = Promise.resolve(undefined);
  const [redditResult, tiktokResult, twitterResult, youtubeResult, instagramResult, trendsResult] =
    await Promise.allSettled([
      want("reddit") ? enrichReddit(query) : skip,
      want("tiktok") ? enrichTikTok(query) : skip,
      want("twitter") ? enrichTwitter(query) : skip,
      want("youtube") ? enrichYouTube(query) : skip,
      want("instagram") ? enrichInstagram(query) : skip,
      want("trends") ? enrichTrends(query) : skip,
    ]);

  return {
    reddit: redditResult.status === "fulfilled" ? redditResult.value : undefined,
    tiktok: tiktokResult.status === "fulfilled" ? tiktokResult.value : undefined,
    twitter: twitterResult.status === "fulfilled" ? twitterResult.value : undefined,
    youtube: youtubeResult.status === "fulfilled" ? youtubeResult.value : undefined,
    instagram: instagramResult.status === "fulfilled" ? instagramResult.value : undefined,
    trends: trendsResult.status === "fulfilled" ? trendsResult.value : undefined,
    enriched_at: new Date().toISOString(),
  };
}

// ─── Signal context formatter (for Claude prompt) ────────────────────────────

export function buildSignalContext(signals: SubcultureSignalData): string {
  const lines: string[] = [
    "=== LIVE SCRAPED SIGNAL DATA (fetched seconds ago) ===",
    "Analyze the patterns in this real content to build an accurate profile.",
    "Your keywords, vernacular, and psychographics must reflect what you actually see here.",
    "",
  ];

  if (signals.reddit) {
    const r = signals.reddit;
    lines.push(`REDDIT — ${r.total_posts_found} posts found`);
    for (const c of r.communities) {
      const size = c.subscriber_count
        ? ` (${(c.subscriber_count / 1_000).toFixed(0)}K members)`
        : "";
      lines.push(`  Community: r/${c.subreddit}${size} — ${c.posts_found} relevant posts`);
    }
    if (r.top_posts.length) {
      lines.push("  Top posts:");
      for (const p of r.top_posts.slice(0, 10)) {
        lines.push(`    • "${p.title}" — ${p.score} upvotes, ${p.comments} comments (r/${p.subreddit})`);
      }
    }
    lines.push("");
  }

  if (signals.tiktok) {
    const t = signals.tiktok;
    lines.push(`TIKTOK — ${t.videos_found} videos, ${t.total_views.toLocaleString()} total views`);
    if (t.top_hashtags.length) {
      lines.push(`  Top hashtags: ${t.top_hashtags.slice(0, 10).join("  ")}`);
    }
    if (t.top_videos.length) {
      lines.push("  Top videos:");
      for (const v of t.top_videos.slice(0, 8)) {
        const followers = v.creator_followers
          ? `, ${(v.creator_followers / 1_000).toFixed(0)}K followers`
          : "";
        lines.push(
          `    • "${v.caption}" — ${v.views.toLocaleString()} views, ${v.likes.toLocaleString()} likes (@${v.creator}${followers})`
        );
      }
    }
    lines.push("");
  }

  if (signals.twitter) {
    const tw = signals.twitter;
    lines.push(`TWITTER/X — ${tw.tweets_found} tweets, ${tw.total_engagement.toLocaleString()} total engagement`);
    if (tw.top_tweets.length) {
      lines.push("  Top tweets:");
      for (const t of tw.top_tweets.slice(0, 8)) {
        const by = t.author ? ` (@${t.author})` : "";
        lines.push(`    • "${t.text}"${by} — ${t.engagement} engagement`);
      }
    }
    lines.push("");
  }

  if (signals.youtube) {
    const yt = signals.youtube;
    lines.push(`YOUTUBE — ${yt.videos_found} videos, ${yt.total_views.toLocaleString()} total views`);
    if (yt.top_videos.length) {
      lines.push("  Top videos:");
      for (const v of yt.top_videos.slice(0, 8)) {
        const subs = v.channel_subscribers
          ? ` (${(v.channel_subscribers / 1_000).toFixed(0)}K subscribers)`
          : "";
        lines.push(
          `    • "${v.title}" — ${v.views.toLocaleString()} views, ${v.likes.toLocaleString()} likes (${v.channel}${subs})`
        );
      }
    }
    lines.push("");
  }

  if (signals.instagram) {
    const ig = signals.instagram;
    lines.push(`INSTAGRAM — ${ig.posts_found} posts, ${ig.total_likes.toLocaleString()} total likes`);
    if (ig.top_hashtags.length) {
      lines.push(`  Top hashtags: ${ig.top_hashtags.slice(0, 10).join("  ")}`);
    }
    if (ig.top_posts.length) {
      lines.push("  Top posts:");
      for (const p of ig.top_posts.slice(0, 6)) {
        const owner = p.owner ? ` (@${p.owner})` : "";
        const caption = p.caption ? `"${p.caption.slice(0, 80)}…"` : "(no caption)";
        lines.push(`    • ${caption}${owner} — ${p.likes.toLocaleString()} likes`);
      }
    }
    lines.push("");
  }

  if (signals.trends) {
    const tr = signals.trends;
    const trendLabel = tr.trend === "rising" ? "↑ Rising" : tr.trend === "declining" ? "↓ Declining" : "→ Stable";
    lines.push(`GOOGLE TRENDS — interest score ${tr.interest_score}/100 (${trendLabel})`);
    if (tr.related_queries.length) {
      lines.push(`  Related searches: ${tr.related_queries.slice(0, 8).join(", ")}`);
    }
    lines.push("");
  }

  const platformsFound = [
    signals.reddit && "Reddit",
    signals.tiktok && "TikTok",
    signals.twitter && "Twitter/X",
    signals.youtube && "YouTube",
    signals.instagram && "Instagram",
    signals.trends && "Google Trends",
  ].filter(Boolean).join(", ");

  if (!platformsFound) {
    lines.push("NOTE: No live signal data was available. Generate the profile from general knowledge.");
  } else {
    lines.push(`=== END SIGNAL DATA (sources: ${platformsFound}) ===`);
  }

  return lines.join("\n");
}
