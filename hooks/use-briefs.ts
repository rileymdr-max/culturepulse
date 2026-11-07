"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContentAngle, PlatformStrategyItem, BriefBrandFit } from "@/lib/content-intelligence";

export type { ContentAngle, PlatformStrategyItem, BriefBrandFit };

export interface BriefSummary {
  id: string;
  headline: string;
  urgency: "act-now" | "this-week" | "monitor";
  createdAt: string;
  velocityAtGeneration: number | null;
  subculture: {
    id: string;
    name: string;
    slug: string;
    category: string;
  };
}

export interface BriefDetail extends BriefSummary {
  momentSummary: string;
  accelerationContext: string;
  contentAngles: ContentAngle[];
  platformStrategy: PlatformStrategyItem[];
  brandFit: BriefBrandFit;
  subculture: {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useBriefs(subcultureId?: string) {
  const params = subcultureId ? `?subcultureId=${subcultureId}` : "";
  return useQuery({
    queryKey: ["briefs", subcultureId ?? "all"],
    queryFn: () => fetchJson<{ briefs: BriefSummary[] }>(`/api/briefs${params}`),
  });
}

export function useBrief(id: string) {
  return useQuery({
    queryKey: ["brief", id],
    queryFn: () => fetchJson<{ brief: BriefDetail }>(`/api/briefs/${id}`),
    enabled: !!id,
  });
}

export function useCreateBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subcultureId?: string; subcultureSlug?: string; monitorId?: string }) =>
      fetchJson<{ brief: BriefSummary }>("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefs"] });
    },
  });
}

export function useDeleteBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/briefs/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok && r.status !== 204) throw new Error("Delete failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefs"] });
    },
  });
}
