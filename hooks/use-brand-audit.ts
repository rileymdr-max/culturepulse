"use client";

import { useMutation } from "@tanstack/react-query";
import type { BrandAuditResult } from "@/lib/types/brand-audit";
import type { HandleMap } from "@/lib/platforms/audience";

export function useBrandAudit() {
  return useMutation<BrandAuditResult, Error, { handles: HandleMap; platform?: string; excludedPlatforms?: string[] }>({
    mutationFn: async ({ handles, platform = "all", excludedPlatforms = [] }) => {
      const res = await fetch("/api/brand-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles, platform, excludedPlatforms }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Brand audit failed (${res.status})`);
      }
      return res.json();
    },
  });
}
