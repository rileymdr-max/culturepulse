import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { PLANS, type PlanId } from "@/lib/plans";

const schema = z.object({
  planId: z.enum(["starter", "pro", "agency"]),
});

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON."); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid plan.", parsed.error.flatten());

  const { planId } = parsed.data;
  const plan = PLANS[planId as PlanId];

  if (!plan.stripePriceId) {
    return badRequest("Stripe is not configured. Add STRIPE_PRICE_* to your environment variables.");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, stripeCustomerId: true },
    });
    if (!user) return serverError("User not found.");

    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      user.email!,
      user.stripeCustomerId
    );

    // Persist the customer ID if it's new
    if (!user.stripeCustomerId) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=1`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
      metadata: { userId: session.user.id, planId },
      subscription_data: {
        metadata: { userId: session.user.id, planId },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return serverError("Failed to create checkout session.");
  }
}
