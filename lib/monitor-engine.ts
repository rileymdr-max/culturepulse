import { prisma } from "@/lib/prisma";
import { enrichSubcultureWithSignals } from "@/lib/subculture-enricher";
import { computeAccelerationSignal, type SnapshotLike } from "@/lib/acceleration";
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
  // Only scrape what this monitor stores. Snapshots are reddit + twitter only,
  // so skipping TikTok/YouTube/Instagram/Trends avoids their slower actors.
  const platforms = monitor.platforms.filter((p) => p === "reddit" || p === "twitter");
  if (platforms.length === 0) {
    await prisma.monitor.update({ where: { id: monitor.id }, data: { lastRunAt: new Date() } });
    return;
  }
  const signals = await enrichSubcultureWithSignals(query, platforms);

  const snapshotRows: Array<{
    monitorId: string;
    platform: "reddit" | "twitter";
    postCount: number;
    engagement: number;
    topPosts: object;
  }> = [];

  if (signals.reddit && monitor.platforms.includes("reddit")) {
    const topPosts = signals.reddit.top_posts.slice(0, 5).map((p) => ({
      title: p.title,
      url: p.url,
      score: p.score,
      comments: p.comments,
    }));
    snapshotRows.push({
      monitorId: monitor.id,
      platform: "reddit",
      postCount: signals.reddit.total_posts_found,
      engagement: signals.reddit.communities.reduce((sum, c) => sum + c.engagement, 0),
      topPosts,
    });
  }

  if (signals.twitter && monitor.platforms.includes("twitter")) {
    const topPosts = signals.twitter.top_tweets.slice(0, 5).map((t) => ({
      title: t.text,
      url: t.url,
      score: t.engagement,
    }));
    snapshotRows.push({
      monitorId: monitor.id,
      platform: "twitter",
      postCount: signals.twitter.tweets_found,
      engagement: signals.twitter.total_engagement,
      topPosts,
    });
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
    take: 20,
  });

  const signal = computeAccelerationSignal(existing);

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      lastRunAt: new Date(),
      ...(signal.isBreakout ? { lastBreakoutAlertAt: new Date() } : {}),
    },
  });
}

/** Max monitors scraped at once. Each runs up to 2 Apify actors, so 4 → ≤8 concurrent Apify runs. */
export const MONITOR_CONCURRENCY = 4;
/**
 * Stop starting new monitors after this long. A monitor takes at most ~65s
 * (Twitter actor 50s + 15s abort margin), so anything started before 200s
 * finishes inside the 300s function limit. Monitors not started are reported
 * as skipped and, being oldest by lastRunAt, go first next run.
 */
export const MONITOR_START_BUDGET_MS = 200_000;

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
