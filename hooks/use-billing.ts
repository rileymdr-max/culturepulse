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

export function useBillingInfo() {
  return useQuery({
    queryKey: ["billing"],
    queryFn: () => fetchJson<{ billing: BillingInfo }>("/api/billing"),
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (planId: Exclude<PlanId, "free">) =>
      fetchJson<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
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

/** Returns the plan from the current NextAuth session (no extra fetch). */
export function useCurrentPlan(): PlanId {
  const { data: session } = useSession();
  return ((session?.user as { plan?: string } | undefined)?.plan as PlanId) ?? "free";
}
