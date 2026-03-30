"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CommunitySnapshot {
  id: string;
  communitySize: number;
  topTopics: string[];
  topCategories: { label: string; volume: number }[];
  capturedAt: string;
}

export interface TrackedCommunity {
  id: string;
  communityId: string;
  communityName: string;
  platform: string;
  createdAt: string;
  snapshots: CommunitySnapshot[];
}

// ─── List tracked communities ─────────────────────────────────────────────────

export function useTracked() {
  return useQuery<{ tracked: TrackedCommunity[] }>({
    queryKey: ["tracked"],
    queryFn: async () => {
      const res = await fetch("/api/tracked");
      if (!res.ok) throw new Error("Failed to load tracked communities");
      return res.json();
    },
    staleTime: 30_000,
  });
}

// ─── Track a community ────────────────────────────────────────────────────────

export function useTrackCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      communityId: string;
      communityName: string;
      platform: string;
    }) => {
      const res = await fetch("/api/tracked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to track community");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracked"] }),
  });
}

// ─── Untrack a community ──────────────────────────────────────────────────────

export function useUntrackCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trackedId: string) => {
      const res = await fetch(`/api/tracked/${trackedId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to untrack community");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracked"] }),
  });
}

// ─── Capture a snapshot ───────────────────────────────────────────────────────

export function useCaptureSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      trackedId: string;
      communitySize: number;
      topTopics: string[];
      topCategories: { label: string; volume: number }[];
      force?: boolean;
    }) => {
      const { trackedId, ...body } = data;
      const res = await fetch(`/api/tracked/${trackedId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to capture snapshot");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracked"] }),
  });
}
