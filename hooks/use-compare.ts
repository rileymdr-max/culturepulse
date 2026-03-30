"use client";

import { useQuery } from "@tanstack/react-query";
import type { CommunityData } from "@/lib/platforms/types";

interface CompareResponse {
  communities: (CommunityData | null)[];
  similarityScores: Record<string, number>;
  pairLabels: { a: string; b: string; score: number }[];
}

/**
 * Fetches comparison data for 2-4 community IDs.
 * @param communityIds - Array of community_id strings
 */
export function useCompare(communityIds: string[]) {
  return useQuery<CompareResponse>({
    queryKey: ["compare", communityIds.sort().join(",")],
    queryFn: async () => {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Compare failed (${res.status})`);
      }
      return res.json();
    },
    enabled: communityIds.length >= 2,
    staleTime: 60_000,
  });
}
