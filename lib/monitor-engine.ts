import { prisma } from "@/lib/prisma";
import { runActor } from "@/lib/apify";
import type { Subculture, Monitor } from "@prisma/client";

interface ApifyRedditPost {
  title?: string;
  url?: string;
  permalink?: string;
  score?: number;
  numberOfComments?: number;
}

interface ApifyTweet {
  text?: string;
  fullText?: string;
  url?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
}

export interface MonitorTopPost {
  title: string;
  url: string;
  score: number;
  comments?: number;
}

function buildMonitorQuery(subculture: Subculture): string {
  const terms = [
    ...subculture.keywords.slice(0, 7),
    ...subculture.vernacular.slice(0, 4),
  ];
  return terms.map((t) => (t.includes(" ") ? `"${t}"` : t)).join(" OR ");
}

async function snapshotReddit(monitorId: string, query: string): Promise<void> {
  const posts = await runActor<ApifyRedditPost>("trudax/reddit-scraper-lite", {
    searches: [query],
    searchPosts: true,
    searchCommunities: false,
    sort: "relevance",
    maxItems: 50,
    skipComments: true,
    proxy: { useApifyProxy: true },
  }, 90);

  const topPosts: MonitorTopPost[] = posts
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5)
    .map((p) => ({
      title: p.title ?? "(no title)",
      url: p.url ?? p.permalink ?? "",
      score: p.score ?? 0,
      comments: p.numberOfComments ?? 0,
    }));

  await prisma.monitorSnapshot.create({
    data: {
      monitorId,
      platform: "reddit",
      postCount: posts.length,
      engagement: posts.reduce((s, p) => s + (p.score ?? 0) + (p.numberOfComments ?? 0), 0),
      topPosts: topPosts as object[],
    },
  });
}

async function snapshotTwitter(monitorId: string, query: string): Promise<void> {
  const tweets = await runActor<ApifyTweet>("apidojo/tweet-scraper", {
    searchTerms: [query],
    maxItems: 50,
    sort: "Latest",
    tweetLanguage: "en",
  }, 90);

  const topPosts: MonitorTopPost[] = tweets
    .sort((a, b) => {
      const eA = (a.likeCount ?? 0) + (a.retweetCount ?? 0) * 2;
      const eB = (b.likeCount ?? 0) + (b.retweetCount ?? 0) * 2;
      return eB - eA;
    })
    .slice(0, 5)
    .map((t) => ({
      title: (t.fullText ?? t.text ?? "").slice(0, 160),
      url: t.url ?? "",
      score: (t.likeCount ?? 0) + (t.retweetCount ?? 0) * 2,
    }));

  await prisma.monitorSnapshot.create({
    data: {
      monitorId,
      platform: "twitter",
      postCount: tweets.length,
      engagement: tweets.reduce(
        (s, t) => s + (t.likeCount ?? 0) + (t.retweetCount ?? 0) * 2 + (t.replyCount ?? 0),
        0
      ),
      topPosts: topPosts as object[],
    },
  });
}

export function computeAccelerationScore(counts: number[]): number {
  if (counts.length < 2) return 0;
  const latest = counts[0];
  const history = counts.slice(1, 8);
  const avg = history.reduce((s, n) => s + n, 0) / history.length;
  if (avg === 0) return latest > 0 ? 100 : 0;
  return Math.round(((latest - avg) / avg) * 100);
}

export async function runMonitor(
  monitor: Monitor & { subculture: Subculture }
): Promise<void> {
  const query = buildMonitorQuery(monitor.subculture);
  const tasks: Promise<void>[] = [];

  if (monitor.platforms.includes("reddit")) tasks.push(snapshotReddit(monitor.id, query));
  if (monitor.platforms.includes("twitter")) tasks.push(snapshotTwitter(monitor.id, query));

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error(`[monitor-engine] snapshot failed for ${monitor.id}:`, r.reason);
    }
  }

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { lastRunAt: new Date() },
  });
}

// Run monitors sequentially so Apify actor concurrency stays predictable
// and we don't exhaust the Vercel function timeout with parallel runs.
export async function runAllActiveMonitors(): Promise<{ ran: number; failed: number; skipped: number }> {
  const monitors = await prisma.monitor.findMany({
    where: { status: "active" },
    include: { subculture: true },
    orderBy: { lastRunAt: "asc" }, // oldest first so stale ones are prioritised
  });

  let ran = 0;
  let failed = 0;
  let skipped = 0;
  const startedAt = Date.now();
  const BUDGET_MS = 240_000; // leave 60s buffer inside the 300s maxDuration

  for (const m of monitors) {
    if (Date.now() - startedAt > BUDGET_MS) {
      skipped++;
      console.warn(`[monitor-engine] budget exceeded — skipping ${m.id}`);
      continue;
    }
    try {
      await runMonitor(m);
      ran++;
    } catch (err) {
      failed++;
      console.error(`[monitor-engine] run failed for ${m.id}:`, err);
    }
  }

  return { ran, failed, skipped };
}
