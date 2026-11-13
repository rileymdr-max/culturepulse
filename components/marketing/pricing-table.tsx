"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { D, CARD, STICKER } from "@/components/marketing/brand";
import {
  PLANS,
  DISPLAY_PLANS,
  SNAPSHOT,
  SALES_URL,
  annualMonthlyPrice,
  type PlanId,
} from "@/lib/plans";
import type { BillingInterval } from "@/hooks/use-billing";

const CTA_BASE =
  "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#111110] px-5 py-3 text-[15px] font-bold transition-colors disabled:opacity-60";
export const CTA_FEATURED = cn(CTA_BASE, "bg-[#FFE14D] text-[#111110] hover:bg-[#FFEA80]");
export const CTA_PLAIN = cn(CTA_BASE, "bg-transparent hover:bg-[#111110] hover:text-[#F2EDE3]");

interface PricingTableProps {
  /** The call to action under each plan card. */
  renderCta: (planId: PlanId, interval: BillingInterval, featured: boolean) => ReactNode;
  /** The call to action on the Snapshot band. */
  snapshotCta: ReactNode;
  /** Marks a card as the viewer's current plan. */
  currentPlan?: PlanId;
}

/** Plan cards with a monthly / annual toggle, plus the one-time Snapshot. */
export function PricingTable({ renderCta, snapshotCta, currentPlan }: PricingTableProps) {
  const [interval, setInterval] = useState<BillingInterval>("month");

  return (
    <div>
      <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full border-2 border-[#111110] bg-[#FFFDF8] p-1">
        {(["month", "year"] as const).map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={interval === i}
            onClick={() => setInterval(i)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
              interval === i ? "bg-[#111110] text-[#F2EDE3]" : "text-[#3B3832] hover:text-[#111110]"
            )}
          >
            {i === "month" ? "Monthly" : "Annual · 2 months free"}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {DISPLAY_PLANS.map((id) => {
          const plan = PLANS[id];
          const featured = id === "pro";
          const isCurrent = currentPlan === id;
          const price = interval === "year" && !plan.salesLed ? annualMonthlyPrice(plan) : plan.price;
          return (
            <div
              key={id}
              className={cn(
                CARD,
                "relative flex flex-col overflow-visible p-6",
                featured && "bg-[#0B6B45] text-white",
                plan.salesLed && "bg-[#111110] text-[#F2EDE3]"
              )}
            >
              {(featured || isCurrent) && (
                <span className={cn(STICKER, "absolute -top-4 right-5 rotate-3 bg-[#FFE14D] px-3 py-1 text-xs text-[#111110]")}>
                  {isCurrent ? "Your plan" : "Most popular"}
                </span>
              )}
              <h3 className={cn(D, "text-2xl")}>{plan.name}</h3>
              <p className={cn("mt-1 text-sm", featured || plan.salesLed ? "text-white/75" : "text-[#66625A]")}>{plan.tagline}</p>
              <p className="mt-4 flex items-baseline gap-1">
                {plan.salesLed && <span className="text-sm text-white/75">From</span>}
                <span className={cn(D, "text-5xl tabular-nums")}>${price.toLocaleString("en-US")}</span>
                <span className={cn("text-sm", featured || plan.salesLed ? "text-white/75" : "text-[#66625A]")}>/mo</span>
              </p>
              <p className={cn("mt-1 h-5 text-xs", featured || plan.salesLed ? "text-white/70" : "text-[#66625A]")}>
                {plan.salesLed
                  ? "Annual contract"
                  : interval === "year"
                    ? `$${(plan.price * 10).toLocaleString("en-US")} billed yearly`
                    : ""}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-[15px]">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check
                      className={cn("mt-0.5 h-4 w-4 shrink-0", featured || plan.salesLed ? "text-[#FFE14D]" : "text-[#0B6B45]")}
                      strokeWidth={3}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
                {plan.comingSoon?.map((f) => (
                  <li key={f} className={cn("flex gap-2.5", featured || plan.salesLed ? "text-white/60" : "text-[#66625A]")}>
                    <span className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {f} (coming soon)
                  </li>
                ))}
              </ul>
              {plan.salesLed ? (
                <a href={SALES_URL} target="_blank" rel="noopener noreferrer" className={CTA_FEATURED}>
                  Talk to us
                </a>
              ) : (
                renderCta(id, interval, featured)
              )}
            </div>
          );
        })}
      </div>

      {/* One-time Snapshot: the paid way in */}
      <div className={cn(CARD, "mt-10 flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between")}>
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0B6B45]">Not ready for a plan?</p>
          <h3 className={cn(D, "mt-2 text-3xl")}>
            {SNAPSHOT.name} · ${SNAPSHOT.price}
          </h3>
          <p className="mt-1 text-sm text-[#66625A]">One-time purchase. See which subcultures your audience lives in.</p>
          <ul className="mt-4 grid gap-2 text-[15px] sm:grid-cols-2">
            {SNAPSHOT.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0B6B45]" strokeWidth={3} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full shrink-0 lg:w-64">{snapshotCta}</div>
      </div>
      <p className="mt-3 text-xs text-[#66625A]">
        Snapshot credit applies to a plan started within {SNAPSHOT.creditWindowDays} days. Prices in USD.
      </p>
    </div>
  );
}
