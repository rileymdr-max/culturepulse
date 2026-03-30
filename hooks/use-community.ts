"use client";

import { useQuery } from "@tanstack/react-query";
import type { CommunityData } from "@/lib/platforms/types";

interface CommunityResponse {
  community: CommunityData;
  cached: boolean;
}

/**
 * Fetches a single community by ID.
 * Refetches every 60 seconds for the live-update effect (Stage 5).
 *
 * @param communityId - The community_id string (will be URL-encoded)
 */
export function useCommunity(communityId: string | null) {
  return useQuery<CommunityResponse>({
    queryKey: ["community", communityId],
    queryFn: async () => {
      const res = await fetch(`/api/community/${encodeURIComponent(communityId!)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to load community (${res.status})`);
      }
      return res.json();
    },
    enabled: !!communityId,
    refetchInterval: 60_000, // auto-refresh every 60s
    staleTime: 30_000,
  });
}
