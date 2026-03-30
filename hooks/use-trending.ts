"use client";

import { useQuery } from "@tanstack/react-query";
import type { CommunityData } from "@/lib/platforms/types";

interface TrendingResponse {
  communities: CommunityData[];
  total: number;
  generatedAt: string;
}

/**
 * Fetches globally trending communities.
 * @param limit    - Number of communities to return (default 12)
 * @param platform - Optional platform filter
 */
export function useTrending(limit = 12, platform?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (platform) params.set("platform", platform);

  return useQuery<TrendingResponse>({
    queryKey: ["trending", limit, platform],
    queryFn: async () => {
      const res = await fetch(`/api/trending?${params}`);
      if (!res.ok) throw new Error(`Failed to load trending (${res.status})`);
      return res.json();
    },
    staleTime: 5 * 60_000, // trending refreshes every 5 minutes
    refetchInterval: 5 * 60_000,
  });
}
