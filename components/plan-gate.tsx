"use client";

import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCheckout, useCurrentPlan, type CheckoutItem, type PlanId } from "@/hooks/use-billing";
import { PLANS, SALES_URL, hasPlanAccess } from "@/lib/plans";

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
      "flex flex-col items-center gap-3 p-8 border border-dashed border-border rounded-xl text-center max-w-md mx-auto",
      className
    )}>
      <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-semibold text-foreground">
          {feature ?? "This feature"} requires {plan.name}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Available on {plan.name} and above, from ${plan.price.toLocaleString("en-US")}/mo.
        </p>
      </div>
      {plan.salesLed ? (
        <a href={SALES_URL} target="_blank" rel="noopener noreferrer">
          <Button className="gap-2">
            Talk to us <ArrowRight className="h-4 w-4" />
          </Button>
        </a>
      ) : (
        <Button
          className="gap-2"
          disabled={isPending}
          onClick={() => checkout({ item: requiredPlan as CheckoutItem })}
        >
          {isPending ? "Opening checkout…" : `Upgrade to ${plan.name}`} <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
