"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle, AlertCircle, CreditCard, Zap, ArrowRight,
  Loader2, Radio, BookOpen, FileText,
} from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMonitors } from "@/hooks/use-monitors";
import { useBriefs } from "@/hooks/use-briefs";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useCheckout, useBillingPortal, useCurrentPlan } from "@/hooks/use-billing";
import { PLANS, PLAN_ORDER, hasPlanAccess, type PlanId } from "@/lib/plans";

// ─── Usage meter ──────────────────────────────────────────────────────────────

function UsageMeter({ label, used, limit, icon: Icon }: {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  icon: React.ElementType;
}) {
  const unlimited = limit === -1;
  const unavailable = !unlimited && limit === 0;
  const pct = unavailable ? 0 : unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const over = !unlimited && !unavailable && used >= limit;
  const nearLimit = !unlimited && !unavailable && !over && pct >= 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />{label}
        </span>
        <span className={cn(
          "font-medium tabular-nums",
          over ? "text-red-400" : nearLimit ? "text-amber-400" : "text-foreground"
        )}>
          {unavailable ? (
            <span className="text-muted-foreground font-normal text-xs">not available on this plan</span>
          ) : unlimited ? (
            <span className="text-green-400">{used} <span className="text-muted-foreground font-normal">(unlimited)</span></span>
          ) : (
            `${used} / ${limit}`
          )}
        </span>
      </div>
      {!unlimited && !unavailable && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              over ? "bg-red-400" : nearLimit ? "bg-amber-400" : "bg-indigo-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ planId, currentPlanId }: { planId: PlanId; currentPlanId: PlanId }) {
  const plan = PLANS[planId];
  const { mutate: checkout, isPending } = useCheckout();
  const isCurrent = planId === currentPlanId;
  const isDowngrade = PLAN_ORDER.indexOf(planId) < PLAN_ORDER.indexOf(currentPlanId);
  const isUpgrade   = PLAN_ORDER.indexOf(planId) > PLAN_ORDER.indexOf(currentPlanId);

  return (
    <Card className={cn(
      "relative transition-all duration-200 hover:-translate-y-0.5",
      isCurrent
        ? "border-indigo-500/40 shadow-indigo-500/10 shadow-md"
        : "hover:border-border hover:shadow-md",
      planId === "pro" && !isCurrent && "border-amber-500/20 hover:border-amber-500/40"
    )}>
      {planId === "pro" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 tracking-wider">
            MOST POPULAR
          </span>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{plan.name}</CardTitle>
            <div className="flex items-baseline gap-1 mt-1">
              {plan.price > 0 ? (
                <>
                  <span className="text-2xl font-bold text-foreground">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-foreground">Free</span>
              )}
            </div>
          </div>
          {isCurrent && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/30 tracking-wider">
              CURRENT
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>

        {planId !== "free" && (
          <div className="pt-2">
            {isCurrent ? (
              <Button variant="outline" size="sm" className="w-full" disabled>
                Current plan
              </Button>
            ) : isDowngrade ? (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled>
                Downgrade via portal
              </Button>
            ) : plan.stripePriceId ? (
              <Button
                size="sm"
                className="w-full gap-2"
                variant={planId === "pro" ? "default" : "outline"}
                disabled={isPending}
                onClick={() => checkout(planId as Exclude<PlanId, "free">)}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>{isUpgrade ? "Upgrade" : "Get started"} <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="w-full" disabled>
                Contact us
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
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
  const briefCount   = briefsData?.briefs?.length ?? 0;
  const wsCount      = wsData?.workspaces?.length ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-500" />
            Billing & Plan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your subscription and usage.
          </p>
        </div>

        {/* Success / canceled banners */}
        {banner === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-400 p-4 rounded-lg border border-green-500/20 bg-green-500/5">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Subscription activated! Your plan has been updated.
          </div>
        )}
        {banner === "canceled" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 rounded-lg border border-border bg-muted/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Checkout canceled. You haven&apos;t been charged.
          </div>
        )}

        {/* Current plan + usage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current plan */}
          <Card className="border-indigo-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground">{plan.name}</span>
                {plan.price > 0 && (
                  <span className="text-muted-foreground text-sm">${plan.price}/mo</span>
                )}
              </div>

              {currentPlan !== "free" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                  disabled={openingPortal}
                  onClick={() => openPortal()}
                >
                  {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Manage subscription
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Usage */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <UsageMeter
                label="Active monitors"
                used={monitorCount}
                limit={plan.limits.monitors}
                icon={Radio}
              />
              <UsageMeter
                label="Content briefs generated"
                used={briefCount}
                limit={plan.limits.briefs === 0 ? 0 : plan.limits.briefs}
                icon={FileText}
              />
              {hasPlanAccess(currentPlan, "agency") && (
                <UsageMeter
                  label="Workspaces"
                  used={wsCount}
                  limit={plan.limits.workspaces}
                  icon={BookOpen}
                />
              )}
              {!hasPlanAccess(currentPlan, "pro") && (
                <p className="text-xs text-muted-foreground pt-1">
                  Custom subculture creation is available on Pro and above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pricing table */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />All Plans
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_ORDER.map((id) => (
              <PlanCard key={id} planId={id} currentPlanId={currentPlan} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            All prices in USD. Billed monthly. Cancel anytime.
            Agency pricing requires Stripe price ID configuration — contact us for custom pricing.
          </p>
        </div>
      </main>
    </div>
  );
}
