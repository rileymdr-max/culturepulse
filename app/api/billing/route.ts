import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/lib/plans";
import {
  countBriefsThisMonth,
  countSeatsUsed,
  countUsageThisMonth,
  getLibraryAccess,
  listBrandHandles,
  listBrandsAuditedThisMonth,
} from "@/lib/plan-usage";

export async function GET(_req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        stripeCustomerId: true,
        snapshotCredits: true,
        snapshotPurchasedAt: true,
        snapshotCreditUsedAt: true,
      },
    });
    if (!user) return serverError("User not found.");
    const plan = getEffectivePlan(session.user.email, user.plan);
    const { snapshotCredits, snapshotPurchasedAt, snapshotCreditUsedAt, ...billing } = user;

    const [briefsThisMonth, brandAuditsThisMonth, customSubculturesThisMonth, brands, library, seatsUsed] =
      await Promise.all([
        countBriefsThisMonth(session.user.id),
        listBrandsAuditedThisMonth(session.user.id).then((b) => b.length),
        countUsageThisMonth(session.user.id, "custom_subculture"),
        listBrandHandles(session.user.id),
        getLibraryAccess(session.user.id, plan),
        countSeatsUsed(session.user.id),
      ]);

    return NextResponse.json({
      billing: { ...billing, plan },
      usage: {
        briefsThisMonth,
        brandAuditsThisMonth,
        customSubculturesThisMonth,
        brands,
        libraryPicked: library.pickedIds.length,
        libraryPickLimit: library.pickLimit,
        seatsUsed,
      },
      snapshot: { credits: snapshotCredits, purchasedAt: snapshotPurchasedAt, creditUsedAt: snapshotCreditUsedAt },
    });
  } catch (err) {
    console.error("[billing GET]", err);
    return serverError();
  }
}
