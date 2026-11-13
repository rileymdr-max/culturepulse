/**
 * Server-side usage counts and entitlement checks for plan limits
 * (see lib/plans.ts). Monthly limits use calendar months in UTC.
 */

import { prisma, withDbRetry } from "@/lib/prisma";
import {
  getEffectivePlan,
  getPlan,
  startOfUsageMonth,
  withinLimit,
  SNAPSHOT,
  type PlanId,
} from "@/lib/plans";

export type UsageKind = "brand_audit" | "custom_subculture";

/** `subject` names what was used (the brand handle for audits). */
export async function recordUsage(userId: string, kind: UsageKind, subject?: string): Promise<void> {
  await withDbRetry(() => prisma.usageEvent.create({ data: { userId, kind, subject } }));
}

export async function countUsageThisMonth(userId: string, kind: UsageKind): Promise<number> {
  return withDbRetry(() =>
    prisma.usageEvent.count({
      where: { userId, kind, createdAt: { gte: startOfUsageMonth() } },
    })
  );
}

/**
 * Brands audited this month. Re-running a brand already audited this month
 * doesn't count again: the allowance is per brand, not per run.
 */
export async function listBrandsAuditedThisMonth(userId: string): Promise<string[]> {
  const rows = await withDbRetry(() =>
    prisma.usageEvent.findMany({
      where: { userId, kind: "brand_audit", createdAt: { gte: startOfUsageMonth() } },
      distinct: ["subject"],
      select: { subject: true },
    })
  );
  return rows.map((r) => r.subject ?? "");
}

/** Each run still costs scraping + Claude, so one brand can be re-run at most this often. */
export const BRAND_RERUN_HOURS = 24;

export async function countBriefsThisMonth(userId: string): Promise<number> {
  return withDbRetry(() =>
    prisma.contentBrief.count({
      where: { userId, createdAt: { gte: startOfUsageMonth() } },
    })
  );
}

/** Brands with a saved audit — each one holds a brand slot. */
export async function listBrandHandles(userId: string): Promise<string[]> {
  const rows = await withDbRetry(() =>
    prisma.auditLog.findMany({
      where: { userId },
      distinct: ["handle"],
      select: { handle: true },
    })
  );
  return rows.map((r) => normalizeHandle(r.handle));
}

export function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

/** The user's effective plan from the database (admin always gets the top plan). */
export async function getUserPlan(userId: string, email: string | null | undefined): Promise<PlanId | null> {
  const user = await withDbRetry(() =>
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
  );
  if (!user) return null;
  return getEffectivePlan(email, user.plan);
}

// ─── Brand Audits ─────────────────────────────────────────────────────────────

export type AuditPermit =
  | { ok: true; source: "plan" | "snapshot" }
  | { ok: false; message: string };

/**
 * Decides whether a Brand Audit of `handle` may run. Plan allowance first
 * (monthly audits + brand slots); otherwise an unused Snapshot credit.
 */
export async function checkBrandAudit(userId: string, plan: PlanId, handle: string): Promise<AuditPermit> {
  const { limits, name } = getPlan(plan);
  const brand = normalizeHandle(handle);
  const [auditedThisMonth, brands, user, lastRun] = await Promise.all([
    listBrandsAuditedThisMonth(userId),
    listBrandHandles(userId),
    withDbRetry(() => prisma.user.findUnique({ where: { id: userId }, select: { snapshotCredits: true } })),
    withDbRetry(() =>
      prisma.usageEvent.findFirst({
        where: { userId, kind: "brand_audit", subject: brand },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
    ),
  ]);

  // Cost guard: the same brand at most once per BRAND_RERUN_HOURS.
  const rerunAt = lastRun ? new Date(lastRun.createdAt.getTime() + BRAND_RERUN_HOURS * 60 * 60 * 1000) : null;
  if (rerunAt && rerunAt > new Date()) {
    const when = rerunAt.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
    return { ok: false, message: `@${brand} was audited in the last day. You can run it again after ${when} UTC.` };
  }

  const isNewBrand = !brands.includes(brand);
  const alreadyCounted = auditedThisMonth.includes(brand);
  const hasAudit = alreadyCounted || withinLimit(limits.brandAudits, auditedThisMonth.length);
  const hasSlot = !isNewBrand || withinLimit(limits.brandSlots, brands.length);
  if (limits.brandAudits !== 0 && hasAudit && hasSlot) return { ok: true, source: "plan" };

  if ((user?.snapshotCredits ?? 0) > 0) return { ok: true, source: "snapshot" };

  if (limits.brandAudits === 0) {
    return { ok: false, message: `Brand Audits need a plan or a ${SNAPSHOT.name} ($${SNAPSHOT.price}).` };
  }
  if (!hasSlot) {
    return {
      ok: false,
      message: `Your ${name} plan covers ${limits.brandSlots} brand${limits.brandSlots === 1 ? "" : "s"}. Remove a brand from your audit history or upgrade to add another.`,
    };
  }
  return {
    ok: false,
    message:
      limits.brandAudits === 1
        ? `Your ${name} plan includes 1 audited brand a month, and you've used it. That brand can still be re-run; new brands open up on the 1st.`
        : `You've audited all ${limits.brandAudits} brands your ${name} plan includes this month. Brands you've already audited this month can still be re-run.`,
  };
}

/** Records a completed audit (per brand, for the monthly count and re-run guard), or spends a Snapshot credit. */
export async function chargeBrandAudit(userId: string, source: "plan" | "snapshot", handle: string): Promise<void> {
  if (source === "snapshot") {
    await withDbRetry(() =>
      prisma.user.updateMany({
        where: { id: userId, snapshotCredits: { gt: 0 } },
        data: { snapshotCredits: { decrement: 1 } },
      })
    );
    return;
  }
  await recordUsage(userId, "brand_audit", normalizeHandle(handle));
}

// ─── Library access ───────────────────────────────────────────────────────────

export interface LibraryAccess {
  full: boolean;
  /** How many profiles the user may pick (when not full). */
  pickLimit: number;
  pickedIds: string[];
}

export async function getLibraryAccess(userId: string, plan: PlanId): Promise<LibraryAccess> {
  const { libraryPicks } = getPlan(plan).limits;
  if (libraryPicks === -1) return { full: true, pickLimit: -1, pickedIds: [] };
  const [user, picks] = await Promise.all([
    withDbRetry(() => prisma.user.findUnique({ where: { id: userId }, select: { bonusLibraryPicks: true } })),
    withDbRetry(() => prisma.libraryPick.findMany({ where: { userId }, select: { subcultureId: true } })),
  ]);
  return {
    full: false,
    pickLimit: libraryPicks + (user?.bonusLibraryPicks ?? 0),
    pickedIds: picks.map((p) => p.subcultureId),
  };
}

export function canOpenSubculture(access: LibraryAccess, subcultureId: string): boolean {
  return access.full || access.pickedIds.includes(subcultureId);
}

/** Picks can be swapped out only after they've been held this long. */
export const PICK_LOCK_DAYS = 30;

// ─── Seats ────────────────────────────────────────────────────────────────────

/**
 * People on the account: the owner plus everyone in (or invited to) the
 * workspaces they own, each counted once.
 */
export async function countSeatsUsed(ownerId: string): Promise<number> {
  const [members, invites] = await Promise.all([
    withDbRetry(() =>
      prisma.workspaceMember.findMany({
        where: { workspace: { ownerId }, userId: { not: ownerId } },
        select: { user: { select: { email: true } } },
      })
    ),
    withDbRetry(() =>
      prisma.workspaceInvite.findMany({
        where: { workspace: { ownerId }, acceptedAt: null, expiresAt: { gt: new Date() } },
        select: { email: true },
      })
    ),
  ]);
  const people = new Set([
    ...members.map((m) => m.user.email.toLowerCase()),
    ...invites.map((i) => i.email.toLowerCase()),
  ]);
  return 1 + people.size;
}

/** A workspace's limits come from its owner's plan. */
export async function getWorkspaceOwnerPlan(workspaceId: string): Promise<{ ownerId: string; plan: PlanId } | null> {
  const ws = await withDbRetry(() =>
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true, owner: { select: { email: true, plan: true } } },
    })
  );
  if (!ws) return null;
  return { ownerId: ws.ownerId, plan: getEffectivePlan(ws.owner.email, ws.owner.plan) };
}
