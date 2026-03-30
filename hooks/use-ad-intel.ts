"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdIntelItem } from "@/lib/ad-library";

interface AdIntelResponse {
  meta: AdIntelItem[];
  tiktok: AdIntelItem[];
  available: boolean;
  query?: string;
  reason?: string;
}

/**
 * Fetches Meta + TikTok Ad Library results for a given community topic.
 * Skips the request when no query is supplied.
 */
export function useAdIntel(query: string | undefined) {
  return useQuery<AdIntelResponse>({
    queryKey: ["ad-intel", query],
    enabled: !!query,
    staleTime: 1000 * 60 * 15, // 15 minutes
    queryFn: async () => {
      const res = await fetch(`/api/ads?query=${encodeURIComponent(query!)}`, { method: "GET" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Ad intel fetch failed (${res.status})`);
      }
      return res.json();
    },
  });
}
