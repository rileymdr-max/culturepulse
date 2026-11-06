"use client";

import { useMutation } from "@tanstack/react-query";
import type { BrandAuditResult } from "@/lib/types/brand-audit";

export function useBrandAudit() {
  return useMutation<BrandAuditResult, Error, { handle: string; platform?: string }>({
    mutationFn: async ({ handle, platform = "all" }) => {
      const res = await fetch("/api/brand-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, platform }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Brand audit failed (${res.status})`);
      }
      return res.json();
    },
  });
}
