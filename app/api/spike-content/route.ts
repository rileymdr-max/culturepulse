/**
 * POST /api/spike-content
 *
 * Given a platform, community, and spiking topic, fetches the top posts/articles
 * driving that spike using Apify. Falls back to an empty array if unavailable.
 *
 * Body: { platform, communityId, topic }
 * Response: { items: SpikeContentItem[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, enforceRateLimit, badRequest, serverError } from "@/lib/api-helpers";
import { runActor } from "@/lib/apify";
import { getContentUrl } from "@/lib/spike-detection";

export interface SpikeContentItem {
  title: string;
  url: string;
  engagement: number;
  type: string;
}

const bodySchema = z.object({
  platform:    z.string().min(1),
  communityId: z.string().min(1),
  topic:       z.string().min(1).max(200),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const rateLimitError = await enforceRateLimit(req, session.user.id, "spike-content", 20);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON."); }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request.", parsed.error.flatten());

  const { platform, communityId, topic } = parsed.data;
  const cleanTopic = topic.replace(/^#/, "");

  if (!process.env.APIFY_API_TOKEN) {
    return NextResponse.json({ items: [], live: false });
  }

  try {
    const items = await fetchSpikeContent(platform, communityId, cleanTopic);
    return NextResponse.json({ items, live: true });
  } catch (err) {
    console.error("[api/spike-content]", err);
    return NextResponse.json({ items: [], live: false });
  }
}

// ─── Platform-specific content fetchers ──────────────────────────────────────

async function fetchSpikeContent(
  platform: string,
  communityId: string,
  topic: string
): Promise<SpikeContentItem[]> {
  switch (platform) {
    case "twitter":
      return fetchTwitterContent(topic);
    case "reddit":
      return fetchRedditContent(communityId, topic);
    case "tiktok":
      return fetchTikTokContent(topic);
    case "instagram":
      return fetchInstagramContent(topic);
    default:
      return [];
  }
}

async function fetchTwitterContent(topic: string): Promise<SpikeContentItem[]> {
  const tweets = await runActor<{
    text?: string; id?: string;
    public_metrics?: { like_count?: number; retweet_count?: number };
  }>("apify/twitter-scraper", {
    searchTerms: [`#${topic}`],
    maxItems: 5,
    queryType: "Latest",
  }, 45);

  return tweets.slice(0, 3).map((t) => ({
    title: (t.text ?? "").slice(0, 140),
    url: t.id ? `https://x.com/i/web/status/${t.id}` : `https://x.com/search?q=%23${encodeURIComponent(topic)}&f=live`,
    engagement: (t.public_metrics?.like_count ?? 0) + (t.public_metrics?.retweet_count ?? 0) * 2,
    type: "tweet",
  }));
}

async function fetchRedditContent(communityId: string, topic: string): Promise<SpikeContentItem[]> {
  const sub = communityId.replace(/^reddit_/, "").replace(/_/g, "/");
  const posts = await runActor<{
    title?: string; url?: string; score?: number; permalink?: string;
  }>("apify/reddit-scraper", {
    startUrls: [{ url: `https://www.reddit.com/${sub}/search/?q=${encodeURIComponent(topic)}&sort=new&restrict_sr=1` }],
    maxItems: 5,
  }, 45);

  return posts.slice(0, 3).map((p) => ({
    title: p.title ?? topic,
    url: p.permalink ? `https://www.reddit.com${p.permalink}` : (p.url ?? getContentUrl("reddit", communityId, topic)),
    engagement: p.score ?? 0,
    type: "post",
  }));
}

async function fetchTikTokContent(topic: string): Promise<SpikeContentItem[]> {
  const videos = await runActor<{
    text?: string; webVideoUrl?: string; diggCount?: number; shareCount?: number;
  }>("clockworks/tiktok-scraper", {
    hashtags: [topic],
    resultsPerPage: 5,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
  }, 45);

  return videos.slice(0, 3).map((v) => ({
    title: (v.text ?? `#${topic}`).slice(0, 140),
    url: v.webVideoUrl ?? `https://www.tiktok.com/search?q=${encodeURIComponent(topic)}`,
    engagement: (v.diggCount ?? 0) + (v.shareCount ?? 0),
    type: "video",
  }));
}

async function fetchInstagramContent(topic: string): Promise<SpikeContentItem[]> {
  const posts = await runActor<{
    caption?: string; url?: string; likesCount?: number; commentsCount?: number;
  }>("apify/instagram-scraper", {
    hashtags: [topic],
    resultsLimit: 5,
  }, 45);

  return posts.slice(0, 3).map((p) => ({
    title: (p.caption ?? `#${topic}`).slice(0, 140),
    url: p.url ?? `https://www.instagram.com/explore/tags/${encodeURIComponent(topic)}/`,
    engagement: (p.likesCount ?? 0) + (p.commentsCount ?? 0),
    type: "post",
  }));
}
