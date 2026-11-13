import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSession, badRequest, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { PLANS, SNAPSHOT } from "@/lib/plans";

const schema = z.object({
  item: z.enum(["starter", "pro", "agency", "snapshot"]),
  interval: z.enum(["month", "year"]).default("month"),
});

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON."); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid plan.", parsed.error.flatten());
  const { item, interval } = parsed.data;

  const priceId =
    item === "snapshot"
      ? SNAPSHOT.stripePriceId
      : interval === "year"
        ? PLANS[item].stripePriceIdAnnual
        : PLANS[item].stripePriceId;
  if (!priceId) {
    return badRequest("Stripe is not configured for this purchase yet. Add its STRIPE_PRICE_* environment variable.");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, stripeCustomerId: true, snapshotPurchasedAt: true, snapshotCreditUsedAt: true },
    });
    if (!user) return serverError("User not found.");

    const customerId = await getOrCreateStripeCustomer(session.user.id, user.email!, user.stripeCustomerId);
    if (!user.stripeCustomerId) {
      await prisma.user.update({ where: { id: session.user.id }, data: { stripeCustomerId: customerId } });
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const metadata = { userId: session.user.id, planId: item, interval };

    if (item === "snapshot") {
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard/brand-audit?snapshot=1`,
        cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
        metadata: { ...metadata, kind: "snapshot" },
      });
      return NextResponse.json({ url: checkoutSession.url });
    }

    // A Snapshot bought in the last 30 days is credited toward the first payment.
    const windowMs = SNAPSHOT.creditWindowDays * 24 * 60 * 60 * 1000;
    const snapshotCredit =
      !!SNAPSHOT.creditCouponId &&
      !!user.snapshotPurchasedAt &&
      !user.snapshotCreditUsedAt &&
      Date.now() - user.snapshotPurchasedAt.getTime() < windowMs;

    const params: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=1`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
      metadata: { ...metadata, snapshotCredit: snapshotCredit ? "1" : "0" },
      subscription_data: { metadata: { userId: session.user.id, planId: item } },
    };
    // Stripe allows either an automatic discount or promo-code entry, not both.
    if (snapshotCredit) params.discounts = [{ coupon: SNAPSHOT.creditCouponId! }];
    else params.allow_promotion_codes = true;

    const checkoutSession = await stripe.checkout.sessions.create(params);
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return serverError("Failed to create checkout session.");
  }
}
