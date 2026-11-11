import { prisma } from "@/lib/prisma";
import { enrichSubcultureWithSignals } from "@/lib/subculture-enricher";
import { computeAccelerationSignal, type SnapshotLike } from "@/lib/acceleration";
import { sendBreakoutAlert } from "@/lib/email";
import type { Monitor, Subculture } from "@prisma/client";

/**
 * Simplified score for a single stream of engagement values (newest first).
 * Used by the weekly digest email to rank monitors without full platform breakdown.
 */
export function computeAccelerationScore(engagements: number[]): number {
  if (engagements.length < 2) return 0;
  const latest = engagements[0];
  const history = engagements.slice(1, 8);
  const avg = history.reduce((s, n) => s + n, 0) / history.length;
  if (avg === 0) return latest > 0 ? 50 : 0;
  const velocity = ((latest - avg) / avg) * 100;
  return Math.round(Math.min(100, Math.max(0, (velocity + 20) * 1.25)));
}

type MonitorWithSubculture = Monitor & { subculture: Subculture };

function buildSearchQuery(subculture: Subculture): string {
  const terms = subculture.keywords?.slice(0, 4) ?? [];
  return terms.length > 0 ? `${subculture.name} ${terms.join(" ")}` : subculture.name;
}

export async function runMonitor(monitor: MonitorWithSubculture): Promise<void> {
  const query = buildSearchQuery(monitor.subculture);
  const signals = await enrichSubcultureWithSignals(query);

  const snapshotRows: Array<{
    monitorId: string;
    platform: string;
    postCount: number;
    engagement: number;
    topPosts: object;
  }> = [];
  const wants = (p: string) => monitor.platforms.includes(p);
  const add = (platform: string, postCount: number, engagement: number, topPosts: object[]) =>
    snapshotRows.push({
      monitorId: monitor.id,
      platform,
      postCount: Math.round(postCount),
      engagement: Math.min(2_147_483_647, Math.round(engagement)), // Int column
      topPosts: topPosts.slice(0, 5),
    });

  if (signals.reddit && wants("reddit")) {
    const r = signals.reddit;
    add(
      "reddit",
      r.total_posts_found,
      r.communities.reduce((sum, c) => sum + c.engagement, 0),
      r.top_posts.map((p) => ({ title: p.title, url: p.url, score: p.score, comments: p.comments }))
    );
  }

  if (signals.twitter && wants("twitter")) {
    const t = signals.twitter;
    add(
      "twitter",
      t.tweets_found,
      t.total_engagement,
      t.top_tweets.map((p) => ({ title: p.text, url: p.url, score: p.engagement }))
    );
  }

  if (signals.tiktok && wants("tiktok")) {
    const t = signals.tiktok;
    add(
      "tiktok",
      t.videos_found,
      t.total_views,
      t.top_videos.map((v) => ({ title: v.caption, url: v.url, score: v.views }))
    );
  }

  if (signals.youtube && wants("youtube")) {
    const y = signals.youtube;
    add(
      "youtube",
      y.videos_found,
      y.total_views,
      y.top_videos.map((v) => ({ title: v.title, url: v.url, score: v.views }))
    );
  }

  if (signals.instagram && wants("instagram")) {
    const i = signals.instagram;
    add(
      "instagram",
      i.posts_found,
      i.total_likes,
      i.top_posts.map((p) => ({
        title: p.caption ?? (p.owner ? `@${p.owner}` : "Instagram post"),
        url: p.url,
        score: p.likes,
        comments: p.comments,
      }))
    );
  }

  if (signals.trends && wants("trends")) {
    // Trends has no posts: postCount holds search interest (0–100) so velocity
    // still tracks it, and topPosts holds related searches.
    const g = signals.trends;
    add(
      "trends",
      g.interest_score,
      g.interest_score,
      g.related_queries.map((q) => ({
        title: q,
        url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(q)}`,
        score: 0,
      }))
    );
  }

  if (snapshotRows.length === 0) {
    // Still update lastRunAt so the cron doesn't retry immediately
    await prisma.monitor.update({
      where: { id: monitor.id },
      data: { lastRunAt: new Date() },
    });
    return;
  }

  await prisma.monitorSnapshot.createMany({ data: snapshotRows });

  // Compute acceleration from new + existing snapshots to detect breakouts
  const existing: SnapshotLike[] = await prisma.monitorSnapshot.findMany({
    where: { monitorId: monitor.id },
    select: { platform: true, postCount: true, capturedAt: true },
    orderBy: { capturedAt: "desc" },
    take: 60, // ~10 runs across six platforms
  });

  const signal = computeAccelerationSignal(existing);

  const shouldAlert =
    signal.isBreakout &&
    (monitor.lastBreakoutAlertAt === null ||
      Date.now() - new Date(monitor.lastBreakoutAlertAt).getTime() > 24 * 60 * 60 * 1000);

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      lastRunAt: new Date(),
      ...(shouldAlert ? { lastBreakoutAlertAt: new Date() } : {}),
    },
  });

  if (shouldAlert) {
    // Fire alert in background — a failed email must not fail the monitor run
    const user = await prisma.user.findUnique({
      where: { id: monitor.userId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      const latestSnap = snapshotRows[0];
      const topPost = Array.isArray(latestSnap?.topPosts) && latestSnap.topPosts.length > 0
        ? (latestSnap.topPosts[0] as { title: string; url: string; score: number })
        : undefined;
      sendBreakoutAlert({
        toEmail: user.email,
        toName: user.name ?? "there",
        subcultureName: monitor.subculture.name,
        breakoutScore: signal.breakoutScore,
        platforms: monitor.platforms,
        topPost,
      }).catch((err) => console.error("[monitor-engine] breakout alert send failed:", err));
    }
  }
}

/** Max monitors scraped at once. Each runs up to 5 Apify actors, so 4 → ≤20 concurrent Apify runs. */
export const MONITOR_CONCURRENCY = 4;
/**
 * Stop starting new monitors after this long. A monitor takes at most ~105s
 * (TikTok actor 90s + 15s abort margin), so anything started before 180s
 * finishes inside the 300s function limit. Monitors not started are reported
 * as skipped and, being oldest by lastRunAt, go first next run.
 */
export const MONITOR_START_BUDGET_MS = 180_000;

export type MonitorRunResult = {
  monitorId: string;
  status: "ok" | "failed" | "skipped";
  error?: string;
  durationMs?: number;
};

export type MonitorRunSummary = {
  ran: number;
  failed: number;
  skipped: number;
  results: MonitorRunResult[];
};

/**
 * Runs monitors with a concurrency cap. One monitor failing never stops the
 * others; each gets its own result entry with status and error message.
 */
export async function runMonitors(
  monitors: MonitorWithSubculture[],
  {
    concurrency = MONITOR_CONCURRENCY,
    startBudgetMs = MONITOR_START_BUDGET_MS,
    logTag = "monitor-engine",
  }: { concurrency?: number; startBudgetMs?: number; logTag?: string } = {}
): Promise<MonitorRunSummary> {
  const startedAt = Date.now();
  const results: MonitorRunResult[] = new Array(monitors.length);
  let next = 0;

  async function worker() {
    while (next < monitors.length) {
      const i = next++;
      const monitor = monitors[i];
      if (Date.now() - startedAt > startBudgetMs) {
        results[i] = { monitorId: monitor.id, status: "skipped", error: "Time budget reached" };
        continue;
      }
      const t0 = Date.now();
      try {
        await runMonitor(monitor);
        results[i] = { monitorId: monitor.id, status: "ok", durationMs: Date.now() - t0 };
      } catch (err) {
        console.error(`[${logTag}] failed monitor ${monitor.id}:`, err);
        results[i] = {
          monitorId: monitor.id,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - t0,
        };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, monitors.length)) }, worker)
  );

  const count = (s: MonitorRunResult["status"]) => results.filter((r) => r.status === s).length;
  const summary = { ran: count("ok"), failed: count("failed"), skipped: count("skipped"), results };
  console.log(
    `[${logTag}] ran=${summary.ran} failed=${summary.failed} skipped=${summary.skipped} ` +
      `in ${Math.round((Date.now() - startedAt) / 1000)}s`
  );
  return summary;
}

export async function runAllActiveMonitors(): Promise<MonitorRunSummary> {
  const monitors = await prisma.monitor.findMany({
    where: { status: "active" },
    include: { subculture: true },
    // Least recently run first, so anything skipped on a busy run goes first next time.
    orderBy: { lastRunAt: { sort: "asc", nulls: "first" } },
  });
  return runMonitors(monitors, { logTag: "monitors/run" });
}
