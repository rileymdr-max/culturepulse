import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({ billing: user });
  } catch (err) {
    console.error("[billing GET]", err);
    return serverError();
  }
}
