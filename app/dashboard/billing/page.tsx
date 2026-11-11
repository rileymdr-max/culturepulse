"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, AlertCircle, ArrowRight, Loader2, ExternalLink, X } from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMonitors } from "@/hooks/use-monitors";
import { useBriefs } from "@/hooks/use-briefs";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useCheckout, useBillingPortal, useCurrentPlan } from "@/hooks/use-billing";
import { PLANS, PLAN_ORDER, hasPlanAccess, type PlanId } from "@/lib/plans";

const price = (n: number) => `$${n.toLocaleString("en-US")}`;

// Usage meter ────────────────────────────────────────────────────────────────

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number /* -1 = unlimited */ }) {
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
          {unavailable ? "Not on your plan" : unlimited ? `${used} · Unlimited` : `${used} of ${limit}`}
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

// Plan card ──────────────────────────────────────────────────────────────────

function PlanCard({ planId, currentPlanId, onManage, managing }: {
  planId: PlanId;
  currentPlanId: PlanId;
  onManage: () => void;
  managing: boolean;
}) {
  const plan = PLANS[planId];
  const { mutate: checkout, isPending } = useCheckout();
  const isCurrent = planId === currentPlanId;
  const isDowngrade = PLAN_ORDER.indexOf(planId) < PLAN_ORDER.indexOf(currentPlanId);

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card p-6", isCurrent ? "border-primary ring-1 ring-primary" : "border-border")}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{plan.name}</h3>
        {isCurrent && <span className="text-xs font-medium text-primary">Your plan</span>}
      </div>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{plan.price > 0 ? price(plan.price) : "$0"}</span>
        {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
      </p>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {isCurrent ? (
          <p className="flex h-9 items-center justify-center text-sm text-muted-foreground">You’re on this plan</p>
        ) : planId === "free" ? null : isDowngrade ? (
          <Button variant="ghost" className="w-full text-muted-foreground" disabled={managing} onClick={onManage}>
            Switch in billing portal
          </Button>
        ) : plan.stripePriceId ? (
          <Button
            className="w-full"
            variant={planId === "pro" ? "default" : "outline"}
            disabled={isPending}
            onClick={() => checkout(planId as Exclude<PlanId, "free">)}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPending ? "Opening checkout…" : `Upgrade to ${plan.name}`}
            {!isPending && <ArrowRight className="h-4 w-4" />}
          </Button>
        ) : (
          <p className="flex h-9 items-center justify-center text-sm text-muted-foreground">Available on request</p>
        )}
      </div>
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

  const { data: monitorsData } = useMonitors();
  const { data: briefsData } = useBriefs();
  const { data: wsData } = useWorkspaces();
  const { mutate: openPortal, isPending: openingPortal } = useBillingPortal();

  const monitorCount = monitorsData?.monitors?.length ?? 0;
  const briefCount = briefsData?.briefs?.length ?? 0;
  const wsCount = wsData?.workspaces?.length ?? 0;
  const paid = currentPlan !== "free";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-10 sm:px-6">
        <header>
          <h1 className="text-4xl tracking-tight">Billing</h1>
          <p className="mt-2 text-muted-foreground">
            You’re on the <span className="font-medium text-foreground">{plan.name}</span> plan
            {plan.price > 0 && <span className="tabular-nums"> ({price(plan.price)}/mo)</span>}.
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
        <section className="mt-10 grid gap-8 rounded-xl border border-border bg-card p-6 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Usage</h2>
            <p className="mt-1 text-sm text-muted-foreground">What your {plan.name} plan includes, and how much you’ve used.</p>
            {paid && (
              <Button variant="outline" size="sm" className="mt-4" disabled={openingPortal} onClick={() => openPortal()}>
                {openingPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                {openingPortal ? "Opening…" : "Invoices & payment method"}
              </Button>
            )}
          </div>
          <div className="space-y-5">
            <UsageMeter label="Active monitors" used={monitorCount} limit={plan.limits.monitors} />
            <UsageMeter label="Content briefs" used={briefCount} limit={plan.limits.briefs} />
            {hasPlanAccess(currentPlan, "agency") && (
              <UsageMeter label="Workspaces" used={wsCount} limit={plan.limits.workspaces} />
            )}
            {!hasPlanAccess(currentPlan, "pro") && (
              <p className="text-sm text-muted-foreground">Creating your own subculture profiles is available on Pro and above.</p>
            )}
          </div>
        </section>

        {/* Plans */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Plans</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_ORDER.map((id) => (
              <PlanCard key={id} planId={id} currentPlanId={currentPlan} onManage={() => openPortal()} managing={openingPortal} />
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Prices in USD, billed monthly. Cancel anytime.</p>
        </section>
      </main>
    </div>
  );
}
