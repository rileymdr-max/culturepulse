"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubcultureProfile } from "@/lib/types/subculture";

export interface SubcultureSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  status: string;
  generatedByAi: boolean;
  enrichedByApify: boolean;
  createdAt: string;
  updatedAt: string;
  /** True when the viewer's plan only shows a teaser of this profile. */
  locked?: boolean;
}

/** The viewer's library allowance (see lib/plan-usage.ts). */
export interface LibraryAccessInfo {
  full: boolean;
  /** -1 = whole library. */
  pickLimit: number;
  picked: number;
}

export interface SubcultureFull extends SubcultureSummary {
  keywords: string[];
  vernacular: string[];
  categoricalBehaviors: string[];
  moments: { name: string; timing: string; description: string }[];
  mediaSources: { name: string; type: string; description: string }[];
  icons: { name: string; role: string; sentiment: string }[];
  platforms: { platform: string; engagement_level: string; content_formats: string[] }[];
  psychographics: { hero: string; villain: string; core_values: string[]; motivations: string[] };
  adjacentSubcultures: string[];
  brandFitSignals: { fit_industries: string[]; red_flags: string[] };
}

export function useSubcultures(category?: string) {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  return useQuery<{ subcultures: SubcultureSummary[]; total: number; access: LibraryAccessInfo }>({
    queryKey: ["subcultures", category],
    queryFn: async () => {
      const res = await fetch(`/api/subcultures${params}`);
      if (!res.ok) throw new Error("Failed to load subcultures");
      return res.json();
    },
  });
}

export function useSubculture(slug: string) {
  return useQuery<
    | { subculture: SubcultureFull; locked: false }
    | { subculture: SubcultureSummary; locked: true; access: LibraryAccessInfo }
  >({
    queryKey: ["subculture", slug],
    queryFn: async () => {
      const res = await fetch(`/api/subcultures/${slug}`);
      if (!res.ok) throw new Error("Failed to load subculture");
      return res.json();
    },
    enabled: !!slug,
  });
}

export function useGenerateSubculture() {
  const queryClient = useQueryClient();
  return useMutation<
    { subculture: SubcultureFull; saved: boolean },
    Error,
    { name: string; seed?: string }
  >({
    mutationFn: async ({ name, seed }) => {
      const res = await fetch("/api/subcultures/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, seed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Generation failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcultures"] });
    },
  });
}

/** Unlocks a full library profile with one of the plan's picks. */
export function usePickSubculture() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { subcultureId: string }>({
    mutationFn: async ({ subcultureId }) => {
      const res = await fetch("/api/library/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subcultureId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Couldn't add this profile");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcultures"] });
      queryClient.invalidateQueries({ queryKey: ["subculture"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}
