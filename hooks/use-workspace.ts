"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface WorkspaceMember {
  id: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: "admin" | "member";
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  brandLogo: string | null;
  brandColor: string | null;
  customDomain: string | null;
  createdAt: string;
  _count: { members: number };
  owner: { id: string; name: string | null; email: string };
}

export interface WorkspaceDetail extends WorkspaceSummary {
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => fetchJson<{ workspaces: WorkspaceSummary[] }>("/api/workspaces"),
  });
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ["workspace", id],
    queryFn: () => fetchJson<{ workspace: WorkspaceDetail }>(`/api/workspaces/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      fetchJson<{ workspace: WorkspaceSummary }>("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/workspaces/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok && r.status !== 204) throw new Error("Delete failed");
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useUpdateBranding(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      brandName?: string;
      brandLogo?: string | null;
      brandColor?: string;
      customDomain?: string | null;
    }) =>
      fetchJson<{ workspace: WorkspaceDetail }>(`/api/workspaces/${workspaceId}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useInviteMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: "admin" | "member" }) =>
      fetchJson<{ invite: WorkspaceInvite; inviteUrl: string }>(
        `/api/workspaces/${workspaceId}/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace", workspaceId] }),
  });
}

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/workspaces/${workspaceId}/members?userId=${userId}`, { method: "DELETE" }).then(
        (r) => { if (!r.ok && r.status !== 204) throw new Error("Remove failed"); }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace", workspaceId] }),
  });
}
