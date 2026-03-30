"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CommunityData } from "@/lib/platforms/types";

interface SearchParams {
  query: string;
  platforms: string[];
}

interface SearchResult {
  query: string;
  communities: CommunityData[];
  sources: Record<string, boolean>;
  total: number;
}

/**
 * Hook for running community searches via POST /api/search.
 * Returns mutation state + a helper to save the current search.
 */
export function useSearch() {
  const queryClient = useQueryClient();
  const [lastParams, setLastParams] = useState<SearchParams | null>(null);

  const mutation = useMutation<SearchResult, Error, SearchParams>({
    mutationFn: async (params) => {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Search failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (_, params) => {
      setLastParams(params);
    },
  });

  /** Saves the last-run search to the user's account. */
  const saveSearch = async (label?: string) => {
    if (!lastParams) return;
    await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lastParams, label }),
    });
    queryClient.invalidateQueries({ queryKey: ["saved"] });
  };

  return {
    search: mutation.mutate,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    lastParams,
    saveSearch,
    reset: mutation.reset,
  };
}
