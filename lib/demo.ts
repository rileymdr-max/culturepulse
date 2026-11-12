/**
 * One-click demo account.
 *
 * Visitors click "Explore the live demo" on the homepage and are signed in as a
 * shared, read-only demo user. The demo user's data is refreshed manually by the
 * admin via Admin → Demo → "Update demo now" (or on first creation).
 *
 * Only items flagged demoVisible=true on the source account are copied.
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

export function isDemoEmail(email: string | null | undefined): boolean {
  return email === DEMO_EMAIL;
}

function sourceEmail(): string {
  return process.env.DEMO_SOURCE_EMAIL?.trim() || ADMIN_EMAIL;
}

// ─── Demo user ────────────────────────────────────────────────────────────────

/** Returns the demo user, creating it (and running an initial sync) if needed. */
export async function getOrRefreshDemoUser() {
  let demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demo) {
    demo = await prisma.user.create({
      data: { email: DEMO_EMAIL, name: DEMO_NAME, plan: DEMO_PLAN, onboardedAt: new Date(), approvedAt: new Date() },
    });
    await syncDemoData(demo.id).catch((err) => console.error("[demo] initial sync failed", err));
  }
  // No auto-refresh — admin manually triggers updates via Admin → Demo
  return demo;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Copies the source account's demoVisible items to the demo user.
 * Called on first creation and manually via POST /api/admin/demo/sync.
 */
export async function syncDemoData(demoId: string): Promise<{
  monitors: number;
  briefs: number;
  audits: number;
}> {
  const src = await prisma.user.findUnique({
    where: { email: sourceEmail() },
    include: {
      monitors: {
        where: { demoVisible: true },
        include: { snapshots: true },
      },
      briefs: { where: { demoVisible: true } },
      savedSearches: true,
      trackedCommunities: { include: { snapshots: true } },
      auditLogs: {
        where: { demoVisible: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  await prisma.$transaction(
    async (tx) => {
      // Bump updatedAt so callers can display "last synced" time
      await tx.user.update({
        where: { id: demoId },
        data: { name: DEMO_NAME, plan: DEMO_PLAN, onboardedAt: new Date() },
      });

      // Clear everything first (cascades handle snapshots)
      await tx.contentBrief.deleteMany({ where: { userId: demoId } });
      await tx.monitor.deleteMany({ where: { userId: demoId } });
      await tx.savedSearch.deleteMany({ where: { userId: demoId } });
      await tx.trackedCommunity.deleteMany({ where: { userId: demoId } });
      await tx.auditLog.deleteMany({ where: { userId: demoId } });

      if (!src) {
        console.warn(`[demo] source account ${sourceEmail()} not found; demo will be empty`);
        return;
      }

      const monitorIdMap = new Map<string, string>();
      for (const m of src.monitors) {
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

      if (src.briefs.length) {
        await tx.contentBrief.createMany({
          data: src.briefs.map((b) => ({
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

      if (src.savedSearches.length) {
        await tx.savedSearch.createMany({
          data: src.savedSearches.map((s) => ({
            userId: demoId,
            query: s.query,
            platforms: s.platforms,
            label: s.label,
            createdAt: s.createdAt,
          })),
        });
      }

      if (src.auditLogs.length) {
        await tx.auditLog.createMany({
          data: src.auditLogs.map((a) => ({
            userId: demoId,
            handle: a.handle,
            platform: a.platform,
            result: a.result as Prisma.InputJsonValue,
            createdAt: a.createdAt,
          })),
        });
      }

      for (const t of src.trackedCommunities) {
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

  return {
    monitors: src?.monitors.length ?? 0,
    briefs: src?.briefs.length ?? 0,
    audits: src?.auditLogs.length ?? 0,
  };
}
