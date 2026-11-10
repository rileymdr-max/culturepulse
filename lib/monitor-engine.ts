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
  const signals = await enrichSubcultureWithSignals(query);

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

export async function runAllActiveMonitors(): Promise<{
  ran: number;
  failed: number;
  skipped: number;
}> {
  const monitors = await prisma.monitor.findMany({
    where: { status: "active" },
    include: { subculture: true },
  });

  let ran = 0;
  let failed = 0;
  const skipped = 0;

  for (const monitor of monitors) {
    try {
      await runMonitor(monitor);
      ran++;
    } catch (err) {
      console.error(`[monitor-engine] failed monitor ${monitor.id}:`, err);
      failed++;
    }
  }

  return { ran, failed, skipped };
}
