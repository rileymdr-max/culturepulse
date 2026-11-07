"use client";

import { useMutation } from "@tanstack/react-query";
import type { AudienceResult, AudiencePlatform, HandleMap } from "@/lib/platforms/audience";

export function useAudience() {
  return useMutation<AudienceResult, Error, { handles: HandleMap; platform: AudiencePlatform; excludedPlatforms?: string[] }>({
    mutationFn: async ({ handles, platform, excludedPlatforms = [] }) => {
      const res = await fetch("/api/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles, platform, excludedPlatforms }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to analyze audience (${res.status})`);
      }
      return res.json();
    },
  });
}
