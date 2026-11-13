"use client";

import Link from "next/link";
import { PricingTable, CTA_FEATURED, CTA_PLAIN } from "@/components/marketing/pricing-table";
import { PLANS } from "@/lib/plans";

const SIGNUP_HREF = "/register";

/** Logged-out pricing: every option starts with creating an account. */
export function HomePricing() {
  return (
    <PricingTable
      renderCta={(id, _interval, featured) => (
        <Link href={SIGNUP_HREF} className={featured ? CTA_FEATURED : CTA_PLAIN}>
          Choose {PLANS[id].name}
        </Link>
      )}
      snapshotCta={
        <Link href={SIGNUP_HREF} className={CTA_FEATURED}>
          Get your Snapshot
        </Link>
      }
    />
  );
}
