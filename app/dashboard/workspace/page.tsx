"use client";

import { useState } from "react";
import {
  Users, Plus, Trash2, Mail, Copy, CheckCircle,
  AlertCircle, Loader2, Palette, Settings, Shield,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PlanGate } from "@/components/plan-gate";
import {
  useWorkspaces, useWorkspace, useCreateWorkspace,
  useDeleteWorkspace, useInviteMember, useRemoveMember,
  type WorkspaceSummary, type WorkspaceMember, type WorkspaceInvite,
} from "@/hooks/use-workspace";

// ─── Workspace card ───────────────────────────────────────────────────────────

function WorkspaceCard({ ws, currentUserId }: { ws: WorkspaceSummary; currentUserId: string }) {
  const { data } = useWorkspace(ws.id);
  const { mutate: deleteWs, isPending: isDeleting } = useDeleteWorkspace();
  const { mutate: inviteMember, isPending: isInviting, data: inviteResult } = useInviteMember(ws.id);
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember(ws.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [copied, setCopied] = useState(false);

  const workspace = data?.workspace ?? ws;
  const isOwner = ws.owner.id === currentUserId;
  const brandColor = ws.brandColor ?? "#3b82f6";

  async function handleCopyInvite(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card style={{ borderColor: `${brandColor}30` }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {ws.brandLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ws.brandLogo} alt="logo" className="h-8 w-8 rounded object-contain border border-border" />
            ) : (
              <div
                className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {(ws.brandName ?? ws.name).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <CardTitle className="text-base">{ws.brandName ?? ws.name}</CardTitle>
              {ws.brandName && ws.brandName !== ws.name && (
                <p className="text-xs text-muted-foreground">{ws.name}</p>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {ws._count.members} member{ws._count.members !== 1 ? "s" : ""}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Members list */}
        {"members" in workspace && Array.isArray(workspace.members) && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3 w-3" />Members
            </p>
            {(workspace.members as WorkspaceMember[]).map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                  {(m.user.name ?? m.user.email).charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-foreground">{m.user.name ?? m.user.email}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border",
                  m.role === "owner" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                  m.role === "admin" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                  "bg-muted text-muted-foreground border-border"
                )}>
                  {m.role}
                </span>
                {isOwner && m.role !== "owner" && (
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-red-400"
                    disabled={isRemoving}
                    onClick={() => removeMember(m.user.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pending invites */}
        {"invites" in workspace && Array.isArray(workspace.invites) && workspace.invites.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pending invites
            </p>
            {(workspace.invites as WorkspaceInvite[]).map((inv) => (
              <div key={inv.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">{inv.email}</span>
                <span className="shrink-0">({inv.role})</span>
              </div>
            ))}
          </div>
        )}

        {/* Invite URL result */}
        {inviteResult && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border text-xs">
            <span className="flex-1 truncate font-mono text-muted-foreground">{inviteResult.inviteUrl}</span>
            <Button
              variant="ghost" size="icon" className="h-6 w-6 shrink-0"
              onClick={() => handleCopyInvite(inviteResult.inviteUrl)}
            >
              {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}

        {/* Invite form */}
        {isOwner && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail) return;
              inviteMember({ email: inviteEmail, role: inviteRole });
              setInviteEmail("");
            }}
          >
            <Input
              type="email"
              placeholder="Invite by email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-8 text-sm flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
              className="h-8 rounded-md border border-border bg-background text-sm px-2 text-foreground"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit" size="sm" className="h-8 gap-1.5" disabled={isInviting || !inviteEmail}>
              {isInviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Invite
            </Button>
          </form>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Link href={`/dashboard/workspace/branding?id=${ws.id}`} className="flex-1">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs w-full">
              <Palette className="h-3.5 w-3.5" />Branding
            </Button>
          </Link>
          {isOwner && (
            <Button
              variant="ghost" size="sm"
              className={cn("text-xs gap-1.5", confirmDelete ? "text-red-400 hover:text-red-300" : "text-muted-foreground")}
              disabled={isDeleting}
              onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteWs(ws.id); }}
              onBlur={() => setConfirmDelete(false)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmDelete ? "Confirm?" : "Delete"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { data: session } = useSession();
  const { data, isLoading, error } = useWorkspaces();
  const { mutate: createWs, isPending: isCreating } = useCreateWorkspace();
  const [newName, setNewName] = useState("");

  const workspaces = data?.workspaces ?? [];
  const currentUserId = session?.user?.id ?? "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-400" />
              Workspaces
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Shared team environments for Agency-tier accounts. Invite clients, apply branding.
            </p>
          </div>
        </div>

        <PlanGate requiredPlan="agency" feature="Workspaces">
          <>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load workspaces.
              </div>
            )}

            {isLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            )}

            {/* Create workspace */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4" />New Workspace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="flex gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newName.trim()) return;
                    createWs(newName.trim());
                    setNewName("");
                  }}
                >
                  <Input
                    placeholder="Workspace name (e.g. Acme Corp)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isCreating || !newName.trim()} className="gap-2">
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create
                  </Button>
                </form>
              </CardContent>
            </Card>

            {!isLoading && workspaces.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="h-10 w-10 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground font-medium">No workspaces yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Create your first workspace above to invite team members and apply custom branding.
                </p>
              </div>
            )}

            {workspaces.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {workspaces.map((ws) => (
                  <WorkspaceCard key={ws.id} ws={ws} currentUserId={currentUserId} />
                ))}
              </div>
            )}
          </>
        </PlanGate>
      </main>
    </div>
  );
}
