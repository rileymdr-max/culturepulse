import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/lib/plans";
import { countBrandAudits, countBriefsThisMonth } from "@/lib/plan-usage";

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
      },
    });
    if (!user) return serverError("User not found.");
    const plan = getEffectivePlan(session.user.email, user.plan);
    const [briefsThisMonth, brandAudits] = await Promise.all([
      countBriefsThisMonth(session.user.id),
      countBrandAudits(session.user.id, plan),
    ]);
    return NextResponse.json({ billing: user, usage: { briefsThisMonth, brandAudits } });
  } catch (err) {
    console.error("[billing GET]", err);
    return serverError();
  }
}
