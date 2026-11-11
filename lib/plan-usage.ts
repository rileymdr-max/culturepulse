/**
 * Server-side usage counts for plan limits (see lib/plans.ts).
 */

import { prisma, withDbRetry } from "@/lib/prisma";
import { getEffectivePlan, getPlan, startOfUsageMonth, type PlanId } from "@/lib/plans";

export async function countBriefsThisMonth(userId: string): Promise<number> {
  return withDbRetry(() =>
    prisma.contentBrief.count({
      where: { userId, createdAt: { gte: startOfUsageMonth() } },
    })
  );
}

/** Counts Brand Audits in the plan's period: this month, or ever for trial plans. */
export async function countBrandAudits(userId: string, planId: string): Promise<number> {
  const period = getPlan(planId).limits.brandAuditPeriod;
  return withDbRetry(() =>
    prisma.auditLog.count({
      where: {
        userId,
        ...(period === "month" ? { createdAt: { gte: startOfUsageMonth() } } : {}),
      },
    })
  );
}

/** The user's effective plan from the database (admin always gets the top plan). */
export async function getUserPlan(userId: string, email: string | null | undefined): Promise<PlanId | null> {
  const user = await withDbRetry(() =>
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
  );
  if (!user) return null;
  return getEffectivePlan(email, user.plan);
}
