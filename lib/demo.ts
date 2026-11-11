/**
 * One-click demo account.
 *
 * Visitors click "Explore the live demo" on the homepage and are signed in as a
 * shared, read-only demo user. On sign-in, the demo user's data is refreshed
 * from a source account (DEMO_SOURCE_EMAIL, default: the admin account) so the
 * demo always shows real monitors, signal history and briefs.
 *
 * The demo is read-only: middleware.ts blocks every API call that writes data
 * or spends Claude / Apify credit (see lib/demo-policy.ts).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

import { DEMO_EMAIL } from "@/lib/demo-policy";

export { DEMO_EMAIL };
export const DEMO_NAME = "Demo";
const DEMO_PLAN = "pro";
const ADMIN_EMAIL = "rileymdr@gmail.com";

/** Re-copy the source account's data at most this often. */
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function isDemoEmail(email: string | null | undefined): boolean {
  return email === DEMO_EMAIL;
}

function sourceEmail(): string {
  return process.env.DEMO_SOURCE_EMAIL?.trim() || ADMIN_EMAIL;
}

// ─── Demo user + data sync ────────────────────────────────────────────────────

/** Returns the demo user, creating it and refreshing its data when stale. */
export async function getOrRefreshDemoUser() {
  let demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demo) {
    demo = await prisma.user.create({
      data: { email: DEMO_EMAIL, name: DEMO_NAME, plan: DEMO_PLAN, onboardedAt: new Date() },
    });
    await syncDemoData(demo.id).catch((err) => console.error("[demo] initial sync failed", err));
    return demo;
  }

  if (Date.now() - demo.updatedAt.getTime() > SYNC_INTERVAL_MS) {
    await syncDemoData(demo.id).catch((err) => console.error("[demo] sync failed", err));
  }
  return demo;
}

/**
 * Replaces the demo user's monitors, snapshots, briefs, saved searches and
 * tracked communities with a copy of the source account's.
 */
async function syncDemoData(demoId: string): Promise<void> {
  const source = await prisma.user.findUnique({
    where: { email: sourceEmail() },
    include: {
      monitors: { include: { snapshots: true } },
      briefs: true,
      savedSearches: true,
      trackedCommunities: { include: { snapshots: true } },
    },
  });

  await prisma.$transaction(
    async (tx) => {
      // Claim the sync first (bumps updatedAt) so concurrent sign-ins skip it.
      await tx.user.update({
        where: { id: demoId },
        data: { name: DEMO_NAME, plan: DEMO_PLAN, onboardedAt: new Date() },
      });

      // Cascades remove monitor + community snapshots.
      await tx.contentBrief.deleteMany({ where: { userId: demoId } });
      await tx.monitor.deleteMany({ where: { userId: demoId } });
      await tx.savedSearch.deleteMany({ where: { userId: demoId } });
      await tx.trackedCommunity.deleteMany({ where: { userId: demoId } });

      if (!source) {
        console.warn(`[demo] source account ${sourceEmail()} not found; demo will be empty`);
        return;
      }

      const monitorIdMap = new Map<string, string>();
      for (const m of source.monitors) {
        const copy = await tx.monitor.create({
          data: {
            userId: demoId,
            subcultureId: m.subcultureId,
            status: m.status,
            platforms: m.platforms,
            lastRunAt: m.lastRunAt,
            lastBreakoutAlertAt: m.lastBreakoutAlertAt,
            createdAt: m.createdAt,
          },
        });
        monitorIdMap.set(m.id, copy.id);
        if (m.snapshots.length) {
          await tx.monitorSnapshot.createMany({
            data: m.snapshots.map((s) => ({
              monitorId: copy.id,
              platform: s.platform,
              postCount: s.postCount,
              engagement: s.engagement,
              topPosts: s.topPosts as Prisma.InputJsonValue,
              capturedAt: s.capturedAt,
            })),
          });
        }
      }

      if (source.briefs.length) {
        await tx.contentBrief.createMany({
          data: source.briefs.map((b) => ({
            userId: demoId,
            subcultureId: b.subcultureId,
            monitorId: b.monitorId ? monitorIdMap.get(b.monitorId) ?? null : null,
            headline: b.headline,
            urgency: b.urgency,
            momentSummary: b.momentSummary,
            accelerationContext: b.accelerationContext,
            contentAngles: b.contentAngles as Prisma.InputJsonValue,
            platformStrategy: b.platformStrategy as Prisma.InputJsonValue,
            brandFit: b.brandFit as Prisma.InputJsonValue,
            velocityAtGeneration: b.velocityAtGeneration,
            createdAt: b.createdAt,
          })),
        });
      }

      if (source.savedSearches.length) {
        await tx.savedSearch.createMany({
          data: source.savedSearches.map((s) => ({
            userId: demoId,
            query: s.query,
            platforms: s.platforms,
            label: s.label,
            createdAt: s.createdAt,
          })),
        });
      }

      for (const t of source.trackedCommunities) {
        await tx.trackedCommunity.create({
          data: {
            userId: demoId,
            communityId: t.communityId,
            communityName: t.communityName,
            platform: t.platform,
            createdAt: t.createdAt,
            snapshots: {
              create: t.snapshots.map((s) => ({
                communitySize: s.communitySize,
                topTopics: s.topTopics,
                topCategories: s.topCategories as Prisma.InputJsonValue,
                capturedAt: s.capturedAt,
              })),
            },
          },
        });
      }
    },
    { timeout: 30_000 }
  );
}
