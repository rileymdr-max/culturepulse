import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { SNAPSHOT, type PlanId } from "@/lib/plans";

// Stripe requires the raw body to verify the signature.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured.");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (session.mode === "payment" && userId && session.metadata?.kind === "snapshot" && session.payment_status === "paid") {
          await grantSnapshot(userId);
        }
        if (session.mode === "subscription" && userId) {
          const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
          await activateSubscription(userId, session.metadata!.planId as PlanId, sub);
          if (session.metadata?.snapshotCredit === "1") {
            await prisma.user.update({ where: { id: userId }, data: { snapshotCreditUsedAt: new Date() } });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const planId = sub.metadata?.planId as PlanId | undefined;
        if (userId) await updateSubscriptionStatus(userId, planId, sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "free",
              subscriptionStatus: "canceled",
              stripeSubscriptionId: null,
              currentPeriodEnd: null,
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        const sub = invoice.subscription ?? null;
        if (sub) {
          const subscription = await getStripe().subscriptions.retrieve(sub);
          const userId = subscription.metadata?.userId;
          if (userId) {
            await prisma.user.update({
              where: { id: userId },
              data: { subscriptionStatus: "past_due" },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}

async function activateSubscription(userId: string, planId: PlanId, sub: Stripe.Subscription) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: planId,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000),
    },
  });
}

async function updateSubscriptionStatus(userId: string, planId: PlanId | undefined, sub: Stripe.Subscription) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(planId ? { plan: planId } : {}),
      subscriptionStatus: sub.status,
      currentPeriodEnd: new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000),
    },
  });
}

/** One-time Brand Culture Snapshot: one audit credit plus library picks. */
async function grantSnapshot(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      snapshotCredits: { increment: 1 },
      bonusLibraryPicks: { increment: SNAPSHOT.libraryPicks },
      snapshotPurchasedAt: new Date(),
    },
  });
}
