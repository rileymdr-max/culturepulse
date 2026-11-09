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
// Uses Reddit's public search JSON API — no Apify, no auth required.

async function fetchSubredditSize(sub: string): Promise<number | undefined> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/about.json`, {
      headers: { "User-Agent": "CulturePulse/1.0 (signal enrichment)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return undefined;
    const data = await res.json() as { data?: { subscribers?: number } };
    return data?.data?.subscribers;
  } catch {
    return undefined;
  }
}

interface ApifyRedditPost {
  title?: string;
  communityName?: string;
  score?: number;
  commentCount?: number;
  url?: string;
}

async function enrichReddit(query: string): Promise<RedditSignal | undefined> {
  try {
    const { primary } = extractKeyTerms(query);
    const posts = await runActor<ApifyRedditPost>("apify/reddit-scraper", {
      scrapeMode: "posts",
      searchQueries: [primary],
      searchSort: "relevance",
      searchTimeFilter: "year",
      maxSearchResultsPerQuery: 40,
    }, 45);

    if (!posts.length) return undefined;

    // Group by subreddit
    const subredditMap = new Map<string, { posts: ApifyRedditPost[]; engagement: number }>();
    for (const p of posts) {
      const sub = (p.communityName ?? "").replace(/^r\//, "").trim();
      if (!sub) continue;
      const entry = subredditMap.get(sub) ?? { posts: [], engagement: 0 };
      entry.posts.push(p);
      entry.engagement += (p.score ?? 0) + (p.commentCount ?? 0) * 3;
      subredditMap.set(sub, entry);
    }

    const topSubs = Array.from(subredditMap.entries())
      .sort(([, a], [, b]) => b.engagement - a.engagement)
      .slice(0, 5);

    const subscriberCounts = await Promise.all(
      topSubs.map(([sub]) => fetchSubredditSize(sub))
    );

    const communities: RedditCommunity[] = topSubs.map(([sub, data], i) => ({
      subreddit: sub,
      posts_found: data.posts.length,
      engagement: data.engagement,
      subscriber_count: subscriberCounts[i],
    }));

    const topPosts: RedditPost[] = posts
      .filter((p) => p.title && p.url)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10)
      .map((p) => ({
        title: p.title!,
        url: p.url!,
        subreddit: (p.communityName ?? "unknown").replace(/^r\//, ""),
        score: p.score ?? 0,
        comments: p.commentCount ?? 0,
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
    const { primary, hashtags } = extractKeyTerms(query);
    // TikTok: keyword search + top hashtag variants
    const searchQueries = [primary, ...hashtags.slice(0, 2)];
    const videos = await runActor<ApifyTikTokVideo>("clockworks/tiktok-scraper", {
      searchQueries,
      resultsPerPage: 25,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    }, 65);

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

// ─── Main enricher ────────────────────────────────────────────────────────────

export async function enrichSubcultureWithSignals(query: string): Promise<SubcultureSignalData> {
  const [redditResult, tiktokResult, twitterResult] = await Promise.allSettled([
    enrichReddit(query),
    enrichTikTok(query),
    enrichTwitter(query),
  ]);

  return {
    reddit: redditResult.status === "fulfilled" ? redditResult.value : undefined,
    tiktok: tiktokResult.status === "fulfilled" ? tiktokResult.value : undefined,
    twitter: twitterResult.status === "fulfilled" ? twitterResult.value : undefined,
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

  const platformsFound = [
    signals.reddit && "Reddit",
    signals.tiktok && "TikTok",
    signals.twitter && "Twitter/X",
  ].filter(Boolean).join(", ");

  if (!platformsFound) {
    lines.push("NOTE: No live signal data was available. Generate the profile from general knowledge.");
  } else {
    lines.push(`=== END SIGNAL DATA (sources: ${platformsFound}) ===`);
  }

  return lines.join("\n");
}
