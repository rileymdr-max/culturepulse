/**
 * Fan-focused Live snapshot for library profiles.
 *
 * The old snapshot searched one short phrase per platform ("reality"), so it
 * found few posts and many of them were off-topic or from the shows/brands
 * themselves. This version:
 *   1. Builds a search plan from the profile (fan subreddits, fan hashtags,
 *      discussion phrases) with Claude, once, and saves it with the snapshot.
 *   2. Scrapes those places for the last 14 days.
 *   3. Removes posts by the subject itself: shows, brands, networks, teams,
 *      cast/talent and press outlets (a saved list plus a Claude check of who
 *      posted each item). Counts only include fans and people discussing it.
 *   4. Keeps the audience of those official/press posts: their top comments.
 *
 * Used by lib/subculture-refresh.ts. Monitors and Discover don't use it.
 */
import Anthropic from "@anthropic-ai/sdk";
import { runActor } from "./apify";
import { cleanStrings, enrichTrends, withinWindow } from "./subculture-enricher";
import { nameMatches, rankCommunities, topicWords } from "./reddit-communities";
import type {
  AudienceCommentThread,
  InstagramSignal,
  RedditSignal,
  SearchPlan,
  SubcultureProfile,
  SubcultureSignalData,
  TikTokSignal,
  TwitterSignal,
  YouTubeSignal,
} from "./types/subculture";

// ─── 1. Search plan ───────────────────────────────────────────────────────────

const PLAN_TOOL = {
  name: "save_search_plan",
  description: "Save where to find this subculture's fans talking on each platform",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["subreddits", "reddit_queries", "tiktok_hashtags", "tiktok_queries", "x_queries", "youtube_queries", "instagram_hashtags", "trends_term", "official_accounts"],
    properties: {
      subreddits: { type: "array", items: { type: "string" }, description: "Up to 4 active, fan-run subreddits, names only without r/ (e.g. vanderpumprules)" },
      reddit_queries: { type: "array", items: { type: "string" }, description: "Up to 2 Reddit search phrases fans use" },
      tiktok_hashtags: { type: "array", items: { type: "string" }, description: "Up to 3 hashtags fans use, without # (not a brand's own campaign tag)" },
      tiktok_queries: { type: "array", items: { type: "string" }, description: "Up to 2 TikTok search phrases for fan discussion (e.g. 'housewives reunion reaction')" },
      x_queries: { type: "array", items: { type: "string" }, description: "Up to 4 X search phrases fans post with; specific, not a bare brand name" },
      youtube_queries: { type: "array", items: { type: "string" }, description: "Up to 2 YouTube searches that find fan videos (reactions, recaps, reviews, vlogs), not trailers" },
      instagram_hashtags: { type: "array", items: { type: "string" }, description: "Up to 3 Instagram hashtags fans use, without #" },
      trends_term: { type: "string", description: "One Google search term for overall interest, kept whole (e.g. 'reality TV', not 'reality')" },
      official_accounts: { type: "array", items: { type: "string" }, description: "Up to 40 handles or names to EXCLUDE: the shows, brands, networks, studios, teams, leagues, publishers, the cast/talent/athletes/creators who are the subject, and press/news outlets covering it" },
    },
  },
};

const PLAN_PROMPT = `You plan social listening for a marketing intelligence tool. The goal is to hear the FANS of a subculture: ordinary people, fan accounts, fan-run podcasts and recap creators, and anyone discussing it.

We do NOT want posts by the subject itself: the shows, brands, networks, studios, teams, leagues, publishers, the cast/talent/athletes/celebrities, or press and news outlets. Their reach would drown out the fans. (We separately read the comments on their posts, which are fans.)

Use the profile's own subreddits, hashtags, keywords, moments and icons. Prefer specific fan phrases over bare brand names. Only name subreddits you are confident exist and are active.

Every search phrase must contain a term that is unmistakably about this subculture (a show, brand, scene, sport or product name), so it cannot match unrelated posts. Bad: "villain edit", "dawn patrol". Good: "Vanderpump villain edit", "dawn patrol surf session".`;

export async function buildSearchPlan(profile: SubcultureProfile): Promise<SearchPlan> {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: PLAN_PROMPT,
    tools: [PLAN_TOOL],
    messages: [{
      role: "user",
      content: `Subculture profile:\n${JSON.stringify({
        name: profile.name,
        description: profile.description,
        keywords: profile.keywords,
        vernacular: profile.vernacular,
        icons: profile.icons,
        media_sources: profile.media_sources,
        moments: profile.moments,
        platforms: profile.platforms,
      }, null, 1)}\n\nCall save_search_plan.`,
    }],
  });
  const msg = await stream.finalMessage();
  const use = msg.content.find((b) => b.type === "tool_use");
  if (!use || use.type !== "tool_use") throw new Error(`No search plan returned for ${profile.name}`);
  const p = use.input as Omit<SearchPlan, "created_at">;
  const clean = (a: unknown, n: number, strip = /^[#@]|^r\//i) =>
    (Array.isArray(a) ? a : []).map((s) => String(s).trim().replace(strip, "")).filter(Boolean).slice(0, n);
  return {
    subreddits: clean(p.subreddits, 4),
    reddit_queries: clean(p.reddit_queries, 2),
    tiktok_hashtags: clean(p.tiktok_hashtags, 3).map((t) => t.replace(/\s+/g, "")),
    tiktok_queries: clean(p.tiktok_queries, 2),
    x_queries: clean(p.x_queries, 4),
    youtube_queries: clean(p.youtube_queries, 2),
    instagram_hashtags: clean(p.instagram_hashtags, 3).map((t) => t.replace(/\s+/g, "")),
    trends_term: String(p.trends_term || profile.name).trim(),
    official_accounts: clean(p.official_accounts, 40),
    created_at: new Date().toISOString(),
  };
}

// ─── 2. Scrape ────────────────────────────────────────────────────────────────

/** One scraped post/video from any platform, in a common shape. */
interface Item {
  platform: "reddit" | "tiktok" | "twitter" | "youtube" | "instagram";
  url: string;
  text: string;
  handle: string;       // username / channel name
  displayName?: string;
  followers?: number;
  verified?: boolean;
  label?: string;       // X business/affiliate label, bio, etc.
  community?: string;   // subreddit
  communitySize?: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  hashtags: string[];
  fromPlanSub?: boolean;
}

const safe = async <T>(label: string, fn: () => Promise<T[]>): Promise<T[]> => {
  try { return await fn(); } catch (err) { console.warn(`[fan-snapshot] ${label} failed:`, String(err).slice(0, 200)); return []; }
};
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0);

/* eslint-disable @typescript-eslint/no-explicit-any */
async function scrapeReddit(plan: SearchPlan, days: number): Promise<Item[]> {
  const subs = new Set(plan.subreddits.map((s) => s.toLowerCase()));
  const raw = await safe<any>("reddit", () => runActor("harshmaur/reddit-scraper", {
    startUrls: plan.subreddits.map((s) => ({ url: `https://www.reddit.com/r/${s}/top/?t=month` })),
    searchTerms: plan.reddit_queries,
    searchSort: "top",
    searchTime: "month",
    searchPosts: true,
    searchComments: false,
    searchCommunities: false,
    crawlCommentsPerPost: false,
    includeNSFW: false,
    maxPostsCount: 25,
  }, 120, 1024));
  return raw.filter((p) => p.postUrl && p.title && withinWindow(p.createdAt, days)).map((p) => {
    const community = String(p.parsedCommunityName ?? p.communityName ?? "").replace(/^r\//, "");
    return {
      platform: "reddit" as const, url: p.postUrl, text: p.title, handle: p.authorName ?? "",
      community, communitySize: p.subredditSubscribers, fromPlanSub: subs.has(community.toLowerCase()),
      views: 0, likes: num(p.score), comments: num(p.commentsCount), shares: 0, hashtags: [],
    };
  });
}

async function scrapeTikTok(plan: SearchPlan, days: number): Promise<Item[]> {
  if (!plan.tiktok_hashtags.length && !plan.tiktok_queries.length) return [];
  const raw = await safe<any>("tiktok", () => runActor("clockworks/tiktok-scraper", {
    hashtags: plan.tiktok_hashtags,
    searchQueries: plan.tiktok_queries,
    resultsPerPage: 25,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  }, 150, 1024));
  return raw.filter((v) => v.webVideoUrl && withinWindow(v.createTimeISO ?? v.createTime, days)).map((v) => ({
    platform: "tiktok" as const, url: v.webVideoUrl, text: String(v.text ?? ""),
    handle: v.authorMeta?.name ?? "", displayName: v.authorMeta?.nickName, followers: v.authorMeta?.fans,
    verified: v.authorMeta?.verified, label: String(v.authorMeta?.signature ?? "").slice(0, 120),
    views: num(v.playCount), likes: num(v.diggCount), comments: num(v.commentCount), shares: num(v.shareCount),
    hashtags: (v.hashtags ?? []).map((h: any) => String(h?.name ?? "").toLowerCase()).filter(Boolean),
  }));
}

const isoDay = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

async function scrapeX(plan: SearchPlan, days: number): Promise<Item[]> {
  if (!plan.x_queries.length) return [];
  const raw = await safe<any>("x", () => runActor("apidojo/tweet-scraper", {
    searchTerms: plan.x_queries,
    maxItems: 80,
    sort: "Top",
    tweetLanguage: "en",
    start: isoDay(days),
  }, 90));
  return raw.filter((t) => t.url && (t.author || t.tweetBy)).map((t) => {
    const a = t.author ?? t.tweetBy ?? {};
    return {
      platform: "twitter" as const, url: t.url, text: String(t.fullText ?? t.text ?? ""),
      handle: a.userName ?? "", displayName: a.name ?? a.displayName, followers: a.followers,
      verified: !!(a.isVerified || a.verifiedType),
      label: [a.affiliatesHighlightedLabel?.label?.description, String(a.description ?? "").slice(0, 120)].filter(Boolean).join(" · "),
      views: num(t.viewCount), likes: num(t.likeCount), comments: num(t.replyCount), shares: num(t.retweetCount),
      hashtags: [],
    };
  });
}

async function scrapeYouTube(plan: SearchPlan, days: number): Promise<Item[]> {
  if (!plan.youtube_queries.length) return [];
  const raw = await safe<any>("youtube", () => runActor("streamers/youtube-scraper", {
    searchQueries: plan.youtube_queries,
    maxResults: 15,
    sortingOrder: "views",
    dateFilter: "month",
  }, 90));
  return raw.filter((v) => v.title && v.url && v.url.includes("watch") && withinWindow(v.date, days)).map((v) => ({
    platform: "youtube" as const, url: v.url, text: v.title, handle: v.channelName ?? "",
    followers: v.numberOfSubscribers, verified: v.isChannelVerified,
    views: num(v.viewCount), likes: num(v.likes), comments: num(v.commentsCount), shares: 0, hashtags: [],
  }));
}

async function scrapeInstagram(plan: SearchPlan, days: number): Promise<Item[]> {
  if (!plan.instagram_hashtags.length) return [];
  const raw = await safe<any>("instagram", () => runActor("apify/instagram-scraper", {
    resultsType: "posts",
    directUrls: plan.instagram_hashtags.map((t) => `https://www.instagram.com/explore/tags/${encodeURIComponent(t.toLowerCase())}/`),
    resultsLimit: 20,
    onlyPostsNewerThan: `${days} days`,
  }, 90));
  return raw.filter((p) => p.url && withinWindow(p.timestamp, days)).map((p) => ({
    platform: "instagram" as const, url: p.url, text: String(p.caption ?? ""),
    handle: p.ownerUsername ?? "", displayName: p.ownerFullName, verified: p.ownerIsVerified,
    views: Math.max(num(p.videoViewCount), num(p.videoPlayCount)), likes: num(p.likesCount),
    comments: num(p.commentsCount), shares: 0,
    hashtags: [...(p.hashtags ?? []), ...(String(p.caption ?? "").match(/#\w+/g) ?? [])]
      .map((h: string) => h.replace(/^#/, "").toLowerCase()),
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── 3. Who posted it? ────────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const CLASSIFY_TOOL = {
  name: "mark_official_accounts",
  description: "List the accounts that are the subject itself or press, not fans",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["official", "off_topic"],
    properties: {
      official: { type: "array", items: { type: "string" }, description: "The 'key' of every account that is official, cast/talent, or press" },
      off_topic: { type: "array", items: { type: "string" }, description: "The 'key' of every account whose post is not about this subculture at all" },
    },
  },
};

/**
 * Returns the keys ("platform:handle") of accounts to exclude. Fans, fan
 * accounts, fan podcasts, recappers, reviewers and ordinary users are kept.
 */
async function findOfficialAccounts(subculture: string, plan: SearchPlan, items: Item[]): Promise<{ official: Set<string>; offTopic: Set<string> }> {
  const key = (i: Item) => `${i.platform}:${i.handle}`;
  const listed = new Set(plan.official_accounts.map(norm).filter((s) => s.length >= 3));
  const official = new Set<string>();
  const offTopic = new Set<string>();

  // Group by account; Reddit posters are ordinary users, so only check the list.
  const accounts = new Map<string, Item[]>();
  for (const i of items) {
    if (!i.handle) continue;
    if (listed.has(norm(i.handle)) || (i.displayName && listed.has(norm(i.displayName)))) { official.add(key(i)); continue; }
    if (i.platform === "reddit") continue;
    const list = accounts.get(key(i)) ?? [];
    list.push(i);
    accounts.set(key(i), list);
  }
  if (!accounts.size) return { official, offTopic };

  const rows = Array.from(accounts.entries()).slice(0, 150).map(([k, list]) => {
    const i = list[0];
    return [
      `key=${k}`,
      i.displayName ? `name=${i.displayName}` : "",
      i.followers ? `followers=${i.followers}` : "",
      i.verified ? "verified" : "",
      i.label ? `bio=${i.label.replace(/\s+/g, " ").slice(0, 100)}` : "",
      `post="${i.text.replace(/\s+/g, " ").slice(0, 90)}"`,
    ].filter(Boolean).join(" | ");
  });

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 4000,
      system: `You sort social media accounts for a tool that listens to the FANS of "${subculture}".
Mark as official (to exclude): the shows, brands, products, networks, studios, teams, leagues, publishers and their staff accounts; the cast, talent, athletes, musicians or celebrities who are the subject; press, news and entertainment media outlets and their reporters' work accounts.
Keep (do not mark): fans, ordinary users, fan accounts, fan-run podcasts, recappers, reaction channels, independent reviewers and creators discussing the subject.
Known official accounts: ${plan.official_accounts.join(", ") || "none listed"}.
Also list as off_topic any account whose post is not about ${subculture} at all (it only matched a search word).
When unsure, keep the account. Call mark_official_accounts.`,
      tools: [CLASSIFY_TOOL],
      messages: [{ role: "user", content: cleanStrings(rows.join("\n")) }],
    });
    const use = res.content.find((b) => b.type === "tool_use");
    const out = use && use.type === "tool_use" ? (use.input as { official?: string[]; off_topic?: string[] }) : {};
    for (const k of out.official ?? []) if (accounts.has(k)) official.add(k);
    for (const k of out.off_topic ?? []) if (accounts.has(k)) offTopic.add(k);
  } catch (err) {
    console.warn("[fan-snapshot] account check failed; using the saved list only:", String(err).slice(0, 200));
  }
  return { official, offTopic };
}

// ─── 4. Fans' comments on official/press posts ────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchAudienceComments(officialItems: Item[]): Promise<AudienceCommentThread[]> {
  const engagement = (i: Item) => i.comments * 3 + i.likes + i.views / 100;
  const top = (p: Item["platform"]) =>
    officialItems.filter((i) => i.platform === p && i.comments > 0).sort((a, b) => engagement(b) - engagement(a)).slice(0, 2);
  const PER_POST = 12;

  const tiktok = top("tiktok"), youtube = top("youtube"), instagram = top("instagram"), x = top("twitter");
  const [tt, yt, ig, tw] = await Promise.all([
    tiktok.length ? safe<any>("tiktok comments", () => runActor("clockworks/tiktok-comments-scraper", {
      postURLs: tiktok.map((i) => i.url), commentsPerPost: PER_POST,
    }, 90, 1024)) : [],
    youtube.length ? safe<any>("youtube comments", () => runActor("streamers/youtube-comments-scraper", {
      startUrls: youtube.map((i) => ({ url: i.url })), maxComments: PER_POST, sortCommentsBy: "TOP_COMMENTS",
    }, 90)) : [],
    instagram.length ? safe<any>("instagram comments", () => runActor("apify/instagram-scraper", {
      resultsType: "comments", directUrls: instagram.map((i) => i.url), resultsLimit: PER_POST,
    }, 90)) : [],
    x.length ? safe<any>("x replies", () => runActor("apidojo/tweet-scraper", {
      searchTerms: x.map((i) => `conversation_id:${i.url.split("/status/")[1]?.split(/[/?]/)[0]}`),
      maxItems: PER_POST * x.length, sort: "Top",
    }, 60)) : [],
  ]);

  const threads: AudienceCommentThread[] = [];
  const add = (platform: AudienceCommentThread["platform"], post: Item, list: { text: string; likes: number; author?: string }[]) => {
    const comments = list.filter((c) => c.text && c.text.trim().length > 2)
      .sort((a, b) => b.likes - a.likes).slice(0, 5)
      .map((c) => ({ ...c, text: c.text.replace(/\s+/g, " ").slice(0, 220) }));
    if (comments.length) threads.push({ platform, on_account: post.displayName || post.handle, on_url: post.url, comments });
  };
  const idOf = (u: string) => u.match(/video\/(\d+)|\/p\/([^/]+)|\/reel\/([^/]+)|v=([\w-]+)|status\/(\d+)/)?.slice(1).find(Boolean) ?? u;

  for (const post of tiktok) add("tiktok", post, tt.filter((c) => String(c.videoWebUrl ?? c.postUrl ?? c.submittedVideoUrl ?? "").includes(idOf(post.url)))
    .map((c) => ({ text: String(c.text ?? ""), likes: num(c.diggCount), author: c.uniqueId })));
  for (const post of youtube) add("youtube", post, yt.filter((c) => String(c.videoId ?? c.pageUrl ?? "").includes(idOf(post.url)))
    .map((c) => ({ text: String(c.comment ?? c.text ?? ""), likes: num(Number(c.voteCount) || c.likes), author: c.author })));
  for (const post of instagram) add("instagram", post, ig.filter((c) => String(c.postUrl ?? c.inputUrl ?? "").includes(idOf(post.url)))
    .map((c) => ({ text: String(c.text ?? ""), likes: num(c.likesCount), author: c.ownerUsername })));
  for (const post of x) add("twitter", post, tw.filter((c) => String(c.conversationId ?? "") === idOf(post.url) && c.url !== post.url)
    .map((c) => ({ text: String(c.fullText ?? c.text ?? "").replace(/^(@\w+\s+)+/, ""), likes: num(c.likeCount), author: c.author?.userName })));

  return threads;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── 5. Build the snapshot ────────────────────────────────────────────────────

const topTags = (items: Item[], n = 12) => {
  const counts = new Map<string, number>();
  for (const i of items) for (const t of i.hashtags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return Array.from(counts.entries()).sort(([, a], [, b]) => b - a).slice(0, n).map(([t]) => `#${t}`);
};

export async function scrapeFanSnapshot(
  profile: SubcultureProfile,
  plan: SearchPlan,
  days: number
): Promise<SubcultureSignalData> {
  const now = new Date().toISOString();
  const [reddit, tiktok, x, youtube, instagram, trends] = await Promise.all([
    scrapeReddit(plan, days),
    scrapeTikTok(plan, days),
    scrapeX(plan, days),
    scrapeYouTube(plan, days),
    scrapeInstagram(plan, days),
    enrichTrends(plan.trends_term, days, plan.trends_term).catch(() => undefined),
  ]);

  // Same post can come from two searches.
  const seen = new Set<string>();
  const all = [...reddit, ...tiktok, ...x, ...youtube, ...instagram].filter((i) => !seen.has(i.url) && seen.add(i.url));

  const { official: officialKeys, offTopic } = await findOfficialAccounts(profile.name, plan, all);
  const k = (i: Item) => `${i.platform}:${i.handle}`;
  const isOfficial = (i: Item) => officialKeys.has(k(i));
  // Official/press posts that matched only by accident aren't worth reading the comments of either.
  const officialItems = all.filter((i) => isOfficial(i) && !offTopic.has(k(i)));
  const fans = all.filter((i) => !isOfficial(i) && !offTopic.has(k(i)));
  const audience = await fetchAudienceComments(officialItems);

  const of = (p: Item["platform"]) => fans.filter((i) => i.platform === p);

  // Reddit: posts from the plan's fan subreddits, plus search results from
  // communities that are on-topic (same rules as the profile page).
  let redditSignal: RedditSignal | undefined;
  {
    // Keyword search can surface any subreddit (r/cats for "reunion"), so only
    // keep the plan's fan subreddits and ones named after the subculture.
    const words = [...topicWords(profile.name), ...plan.subreddits.map((s) => s.toLowerCase())];
    const posts = of("reddit").filter((p) => p.fromPlanSub || nameMatches(p.community ?? "", words));
    const byCommunity = new Map<string, { posts: Item[]; engagement: number; size?: number }>();
    for (const p of posts) {
      const e = byCommunity.get(p.community!) ?? { posts: [], engagement: 0, size: p.communitySize };
      e.posts.push(p); e.engagement += p.likes + p.comments * 3;
      byCommunity.set(p.community!, e);
    }
    const communities = rankCommunities(
      Array.from(byCommunity.entries()).map(([sub, d]) => ({ subreddit: sub, posts_found: d.posts.length, engagement: d.engagement, subscriber_count: d.size })),
      words,
    );
    const keep = new Set(communities.map((c) => c.subreddit));
    const kept = posts.filter((p) => keep.has(p.community!));
    if (kept.length) redditSignal = {
      communities: communities.slice(0, 5),
      top_posts: kept.sort((a, b) => b.likes - a.likes).slice(0, 10)
        .map((p) => ({ title: p.text.slice(0, 200), url: p.url, subreddit: p.community!, score: p.likes, comments: p.comments })),
      total_posts_found: kept.length,
      scraped_at: now,
    };
  }

  const tt = of("tiktok");
  const tiktokSignal: TikTokSignal | undefined = tt.length ? {
    videos_found: tt.length,
    top_videos: [...tt].sort((a, b) => b.views - a.views).slice(0, 8).map((v) => ({
      caption: v.text.slice(0, 150), url: v.url, views: v.views, likes: v.likes,
      creator: v.displayName || v.handle || "unknown", creator_followers: v.followers,
    })),
    top_hashtags: topTags(tt),
    total_views: tt.reduce((s, v) => s + v.views, 0),
    scraped_at: now,
  } : undefined;

  const xs = of("twitter");
  const xEng = (t: Item) => t.likes + t.shares * 2 + t.comments;
  const twitterSignal: TwitterSignal | undefined = xs.length ? {
    tweets_found: xs.length,
    top_tweets: [...xs].sort((a, b) => xEng(b) - xEng(a)).slice(0, 8)
      .map((t) => ({ text: t.text.slice(0, 200), url: t.url, engagement: xEng(t), author: t.handle })),
    total_engagement: xs.reduce((s, t) => s + xEng(t), 0),
    scraped_at: now,
  } : undefined;

  const yt = of("youtube");
  const youtubeSignal: YouTubeSignal | undefined = yt.length ? {
    videos_found: yt.length,
    top_videos: [...yt].sort((a, b) => b.views - a.views).slice(0, 8).map((v) => ({
      title: v.text, url: v.url, views: v.views, likes: v.likes, channel: v.handle || "unknown", channel_subscribers: v.followers,
    })),
    total_views: yt.reduce((s, v) => s + v.views, 0),
    scraped_at: now,
  } : undefined;

  const ig = of("instagram");
  const instagramSignal: InstagramSignal | undefined = ig.length ? {
    posts_found: ig.length,
    top_posts: [...ig].sort((a, b) => b.likes - a.likes).slice(0, 8).map((p) => ({
      caption: p.text.slice(0, 150), url: p.url, likes: p.likes, comments: p.comments, owner: p.handle,
    })),
    top_hashtags: topTags(ig),
    total_likes: ig.reduce((s, p) => s + p.likes, 0),
    scraped_at: now,
  } : undefined;

  const excludedNames = Array.from(new Set(officialItems.map((i) => i.displayName || i.handle))).slice(0, 12);

  return cleanStrings({
    reddit: redditSignal,
    tiktok: tiktokSignal,
    twitter: twitterSignal,
    youtube: youtubeSignal,
    instagram: instagramSignal,
    trends,
    enriched_at: now,
    window_days: days,
    search_plan: plan,
    excluded: { posts: officialItems.length, accounts: excludedNames },
    audience_comments: audience,
  });
}
