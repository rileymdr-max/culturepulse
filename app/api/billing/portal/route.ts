import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError, badRequest } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(_req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return badRequest("No active subscription found. Subscribe first to manage billing.");
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[billing/portal]", err);
    return serverError("Failed to create billing portal session.");
  }
}
