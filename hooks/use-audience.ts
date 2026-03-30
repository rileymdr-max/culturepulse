"use client";

import { useMutation } from "@tanstack/react-query";
import type { AudienceResult, AudiencePlatform } from "@/lib/platforms/audience";

export function useAudience() {
  return useMutation<AudienceResult, Error, { handle: string; platform: AudiencePlatform }>({
    mutationFn: async ({ handle, platform }) => {
      const res = await fetch("/api/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, platform }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to analyze audience (${res.status})`);
      }
      return res.json();
    },
  });
}
