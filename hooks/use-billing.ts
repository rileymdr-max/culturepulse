"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { PlanId } from "@/lib/plans";

export type { PlanId };

export interface BillingInfo {
  plan: PlanId;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface PlanUsage {
  briefsThisMonth: number;
  brandAuditsThisMonth: number;
  customSubculturesThisMonth: number;
  /** Brands with a saved audit; each holds a brand slot. */
  brands: string[];
  libraryPicked: number;
  /** -1 = whole library. */
  libraryPickLimit: number;
  seatsUsed: number;
}

export interface SnapshotInfo {
  credits: number;
  purchasedAt: string | null;
  creditUsedAt: string | null;
}

export function useBillingInfo() {
  return useQuery({
    queryKey: ["billing"],
    queryFn: () => fetchJson<{ billing: BillingInfo; usage: PlanUsage; snapshot: SnapshotInfo }>("/api/billing"),
  });
}

export type BillingInterval = "month" | "year";

/** A self-serve plan, or the one-time Brand Culture Snapshot. */
export type CheckoutItem = Exclude<PlanId, "free" | "enterprise"> | "snapshot";

export function useCheckout() {
  return useMutation({
    mutationFn: ({ item, interval = "month" }: { item: CheckoutItem; interval?: BillingInterval }) =>
      fetchJson<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, interval }),
      }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: () =>
      fetchJson<{ url: string }>("/api/billing/portal", { method: "POST" }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

/**
 * The signed-in user's plan. Prefers the live plan from /api/billing (shared,
 * cached query) so admin plan changes and Stripe upgrades show up without
 * signing out; falls back to the plan stored in the login session meanwhile.
 */
export function useCurrentPlan(): PlanId {
  const { data: session, status } = useSession();
  const { data } = useQuery({
    queryKey: ["billing"],
    queryFn: () => fetchJson<{ billing: BillingInfo; usage: PlanUsage; snapshot: SnapshotInfo }>("/api/billing"),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
  return data?.billing?.plan ?? ((session?.user as { plan?: string } | undefined)?.plan as PlanId) ?? "free";
}
