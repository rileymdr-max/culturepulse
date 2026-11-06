"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccelerationSignal } from "@/lib/acceleration";

export type { AccelerationSignal };

export interface MonitorTopPost {
  title: string;
  url: string;
  score: number;
  comments?: number;
}

export interface MonitorSnapshotData {
  id: string;
  platform: string;
  postCount: number;
  engagement: number;
  topPosts: MonitorTopPost[];
  capturedAt: string;
}

export interface MonitorData {
  id: string;
  subcultureId: string;
  status: string;
  platforms: string[];
  lastRunAt: string | null;
  createdAt: string;
  subculture: {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
  };
  snapshots: MonitorSnapshotData[];
  signal: AccelerationSignal;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useMonitors(subcultureId?: string) {
  const params = subcultureId ? `?subcultureId=${subcultureId}` : "";
  return useQuery({
    queryKey: ["monitors", subcultureId ?? "all"],
    queryFn: () => fetchJson<{ monitors: MonitorData[] }>(`/api/monitors${params}`),
  });
}

export function useCreateMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subcultureId: string; platforms?: string[] }) =>
      fetchJson<{ monitor: MonitorData }>("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monitors"] });
    },
  });
}

export function useDeleteMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/monitors/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok && r.status !== 204) throw new Error("Delete failed");
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monitors"] });
    },
  });
}

export function usePauseMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "paused" }) =>
      fetchJson<{ monitor: MonitorData }>(`/api/monitors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monitors"] });
    },
  });
}

