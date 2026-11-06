"use client";

import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCheckout, useCurrentPlan, type PlanId } from "@/hooks/use-billing";
import { PLANS, hasPlanAccess } from "@/lib/plans";

interface PlanGateProps {
  requiredPlan: PlanId;
  feature?: string;
  children: React.ReactNode;
  /** If true, renders children blurred with an overlay instead of hiding them. */
  overlay?: boolean;
  className?: string;
}

export function PlanGate({ requiredPlan, feature, children, overlay = false, className }: PlanGateProps) {
  const currentPlan = useCurrentPlan();
  const hasAccess = hasPlanAccess(currentPlan, requiredPlan);

  if (hasAccess) return <>{children}</>;

  const plan = PLANS[requiredPlan];

  if (overlay) {
    return (
      <div className={cn("relative", className)}>
        <div className="blur-sm pointer-events-none select-none" aria-hidden>
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-xl">
          <UpgradeCard requiredPlan={requiredPlan} feature={feature} plan={plan} />
        </div>
      </div>
    );
  }

  return <UpgradeCard requiredPlan={requiredPlan} feature={feature} plan={plan} className={className} />;
}

function UpgradeCard({
  requiredPlan,
  feature,
  plan,
  className,
}: {
  requiredPlan: PlanId;
  feature?: string;
  plan: (typeof PLANS)[PlanId];
  className?: string;
}) {
  const { mutate: checkout, isPending } = useCheckout();

  return (
    <div className={cn(
      "flex flex-col items-center gap-3 p-6 border border-border rounded-xl bg-card text-center max-w-sm mx-auto",
      className
    )}>
      <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <Lock className="h-5 w-5 text-amber-400" />
      </div>
      <div>
        <p className="font-semibold text-foreground">
          {feature ?? "This feature"} requires {plan.name}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upgrade to access this and all {plan.name} features — starting at ${plan.price}/mo.
        </p>
      </div>
      <Button
        className="gap-2"
        disabled={isPending}
        onClick={() => checkout(requiredPlan as Exclude<PlanId, "free">)}
      >
        Upgrade to {plan.name} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
