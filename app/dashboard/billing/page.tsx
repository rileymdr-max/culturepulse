"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, AlertCircle, ArrowRight, Loader2, ExternalLink, X } from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMonitors } from "@/hooks/use-monitors";
import { useWorkspaces } from "@/hooks/use-workspace";
import {
  useCheckout,
  useBillingInfo,
  useBillingPortal,
  useCurrentPlan,
  type CheckoutItem,
} from "@/hooks/use-billing";
import { PLANS, PLAN_ORDER, SNAPSHOT } from "@/lib/plans";
import { PricingTable, CTA_FEATURED, CTA_PLAIN } from "@/components/marketing/pricing-table";

const price = (n: number) => `$${n.toLocaleString("en-US")}`;

// Usage meter ────────────────────────────────────────────────────────────────

function UsageMeter({
  label,
  used,
  limit,
  fullLabel,
}: {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  fullLabel?: string;
}) {
  const unlimited = limit === -1;
  const unavailable = !unlimited && limit === 0;
  const pct = unlimited || unavailable ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const over = !unlimited && !unavailable && used >= limit;
  const nearLimit = !unlimited && !unavailable && !over && pct >= 80;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm">{label}</span>
        <span className={cn("text-sm tabular-nums", over ? "font-medium text-destructive" : nearLimit ? "font-medium text-tier-trending" : "text-muted-foreground")}>
          {unavailable ? "Not on your plan" : unlimited ? (fullLabel ?? `${used} · Unlimited`) : `${used} of ${limit}`}
        </span>
      </div>
      {!unlimited && !unavailable && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", over ? "bg-destructive" : nearLimit ? "bg-tier-trending" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {over && <p className="mt-1.5 text-xs text-destructive">You’ve reached this plan’s limit.</p>}
    </div>
  );
}

// Page ───────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const searchParams = useSearchParams();
  const [banner, setBanner] = useState<"success" | "canceled" | null>(null);

  useEffect(() => {
    if (searchParams.get("success")) setBanner("success");
    if (searchParams.get("canceled")) setBanner("canceled");
  }, [searchParams]);

  const currentPlan = useCurrentPlan();
  const plan = PLANS[currentPlan];
  const { limits } = plan;

  const { data: monitorsData } = useMonitors();
  const { data: billingData } = useBillingInfo();
  const { data: wsData } = useWorkspaces();
  const { mutate: openPortal, isPending: openingPortal } = useBillingPortal();
  const { mutate: checkout, isPending: checkingOut, variables: checkoutVars } = useCheckout();

  const usage = billingData?.usage;
  const snapshotCredits = billingData?.snapshot?.credits ?? 0;
  const monitorCount = monitorsData?.monitors?.length ?? 0;
  const wsCount = wsData?.workspaces?.length ?? 0;
  // Existing subscribers change plans in Stripe's portal, which handles proration.
  const subscribed = !!billingData?.billing?.stripeCustomerId && currentPlan !== "free" && !plan.salesLed;
  const busy = (item: CheckoutItem) => checkingOut && checkoutVars?.item === item;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-10 sm:px-6">
        <header>
          <h1 className="text-4xl tracking-tight">Billing</h1>
          <p className="mt-2 text-muted-foreground">
            {currentPlan === "free" ? (
              <>You don’t have a plan yet. Pick one below, or start with a one-time {SNAPSHOT.name}.</>
            ) : (
              <>
                You’re on the <span className="font-medium text-foreground">{plan.name}</span> plan
                {!plan.salesLed && <span className="tabular-nums"> ({price(plan.price)}/mo)</span>}.
              </>
            )}
          </p>
        </header>

        {banner && (
          <div
            role="status"
            className={cn(
              "mt-6 flex items-center gap-3 rounded-lg px-4 py-3 text-sm animate-in fade-in slide-in-from-top-1 duration-200",
              banner === "success" ? "bg-primary/10 text-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {banner === "success" ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span className="flex-1">
              {banner === "success" ? "Subscription active. Your new plan is ready to use." : "Checkout canceled. You haven’t been charged."}
            </span>
            <button onClick={() => setBanner(null)} aria-label="Dismiss" className="rounded-md p-1 hover:bg-foreground/5">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Usage */}
        <section className="mt-10 grid gap-8 rounded-2xl border-[1.5px] border-foreground bg-card p-6 shadow-[3px_3px_0_hsl(var(--foreground))] lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Usage</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What your plan includes and how much you’ve used. Monthly limits reset on the 1st (UTC).
            </p>
            {snapshotCredits > 0 && (
              <p className="mt-3 text-sm">
                <span className="font-medium">
                  {snapshotCredits} Snapshot audit{snapshotCredits === 1 ? "" : "s"}
                </span>{" "}
                ready to run in{" "}
                <Link href="/dashboard/brand-audit" className="underline underline-offset-4">
                  Brand Audit
                </Link>
                .
              </p>
            )}
            {subscribed && (
              <Button variant="outline" size="sm" className="mt-4" disabled={openingPortal} onClick={() => openPortal()}>
                {openingPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                {openingPortal ? "Opening…" : "Invoices, payment & plan changes"}
              </Button>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <UsageMeter label="Brands" used={usage?.brands.length ?? 0} limit={limits.brandSlots} />
            <UsageMeter label="Brands audited this month" used={usage?.brandAuditsThisMonth ?? 0} limit={limits.brandAudits} />
            <UsageMeter
              label="Library profiles"
              used={usage?.libraryPicked ?? 0}
              limit={usage?.libraryPickLimit ?? limits.libraryPicks}
              fullLabel="Full library"
            />
            <UsageMeter label="Custom subcultures this month" used={usage?.customSubculturesThisMonth ?? 0} limit={limits.customSubcultures} />
            <UsageMeter label="Active monitors" used={monitorCount} limit={limits.monitors} />
            <UsageMeter label="Content briefs this month" used={usage?.briefsThisMonth ?? 0} limit={limits.briefs} />
            <UsageMeter label="Seats" used={usage?.seatsUsed ?? 1} limit={limits.seats} />
            <UsageMeter label="Workspaces" used={wsCount} limit={limits.workspaces} />
          </div>
        </section>

        {/* Plans */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Plans</h2>
          <div className="mt-4">
            <PricingTable
              currentPlan={currentPlan}
              renderCta={(id, interval, featured) => {
                const cls = featured ? CTA_FEATURED : CTA_PLAIN;
                if (id === currentPlan) {
                  return <p className={cn(cls, "pointer-events-none opacity-70")}>Your plan</p>;
                }
                if (subscribed) {
                  const lower = PLAN_ORDER.indexOf(id) < PLAN_ORDER.indexOf(currentPlan);
                  return (
                    <button type="button" className={cls} disabled={openingPortal} onClick={() => openPortal()}>
                      {lower ? "Switch in billing portal" : `Upgrade to ${PLANS[id].name}`}
                    </button>
                  );
                }
                const item = id as CheckoutItem;
                return (
                  <button type="button" className={cls} disabled={checkingOut} onClick={() => checkout({ item, interval })}>
                    {busy(item) && <Loader2 className="h-4 w-4 animate-spin" />}
                    {busy(item) ? "Opening checkout…" : `Choose ${PLANS[id].name}`}
                    {!busy(item) && <ArrowRight className="h-4 w-4" />}
                  </button>
                );
              }}
              snapshotCta={
                <button
                  type="button"
                  className={CTA_FEATURED}
                  disabled={checkingOut}
                  onClick={() => checkout({ item: "snapshot" })}
                >
                  {busy("snapshot") && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy("snapshot") ? "Opening checkout…" : `Buy for $${SNAPSHOT.price}`}
                </button>
              }
            />
          </div>
        </section>
      </main>
    </div>
  );
}
