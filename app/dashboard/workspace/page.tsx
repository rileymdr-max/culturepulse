"use client";

import { useState } from "react";
import { Plus, Trash2, Mail, Copy, Check, AlertCircle, Loader2, Palette, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PlanGate } from "@/components/plan-gate";
import {
  useWorkspaces, useWorkspace, useCreateWorkspace,
  useDeleteWorkspace, useInviteMember, useRemoveMember,
  type WorkspaceSummary, type WorkspaceMember, type WorkspaceInvite,
} from "@/hooks/use-workspace";

const inputCls =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };

// Workspace card ─────────────────────────────────────────────────────────────

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
  const displayName = ws.brandName ?? ws.name;
  const members = "members" in workspace && Array.isArray(workspace.members) ? (workspace.members as WorkspaceMember[]) : null;
  const invites = "invites" in workspace && Array.isArray(workspace.invites) ? (workspace.invites as WorkspaceInvite[]) : [];

  async function handleCopyInvite(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className="flex flex-col rounded-2xl border-[1.5px] border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))] p-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        {ws.brandLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ws.brandLogo} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-contain" />
        ) : (
          <div
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: ws.brandColor ?? "hsl(var(--primary))" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold tracking-tight">{displayName}</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {ws.brandName && ws.brandName !== ws.name ? `${ws.name} · ` : ""}
            {ws._count.members} member{ws._count.members !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {/* Members */}
      {members && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold">Members</h3>
          <ul className="mt-2 divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {(m.user.name ?? m.user.email).charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.user.name ?? m.user.email}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role] ?? m.role}</span>
                {isOwner && m.role !== "owner" && (
                  <button
                    type="button"
                    aria-label={`Remove ${m.user.name ?? m.user.email}`}
                    disabled={isRemoving}
                    onClick={() => removeMember(m.user.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold">Waiting to join</h3>
          <ul className="mt-2 space-y-1.5">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{inv.email}</span>
                <span className="text-xs">{ROLE_LABEL[inv.role] ?? inv.role}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Invite */}
      {isOwner && (
        <section className="mt-6">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail) return;
              inviteMember({ email: inviteEmail, role: inviteRole });
              setInviteEmail("");
            }}
          >
            <label className="sr-only" htmlFor={`invite-${ws.id}`}>Email to invite</label>
            <input
              id={`invite-${ws.id}`}
              type="email"
              placeholder="name@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={cn(inputCls, "min-w-0 flex-1")}
            />
            <label className="sr-only" htmlFor={`role-${ws.id}`}>Role</label>
            <select
              id={`role-${ws.id}`}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
              className={cn(inputCls, "px-2")}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit" disabled={isInviting || !inviteEmail}>
              {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Invite
            </Button>
          </form>

          {inviteResult && (
            <div className="mt-3 rounded-lg bg-muted p-3 animate-in fade-in duration-200">
              <p className="text-xs font-medium text-muted-foreground">Invite link. Send it to them directly:</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{inviteResult.inviteUrl}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => handleCopyInvite(inviteResult.inviteUrl)}>
                  {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Actions */}
      <footer className="mt-6 flex items-center gap-1 border-t border-border pt-4">
        <Link
          href={`/dashboard/workspace/branding?id=${ws.id}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Palette className="h-3.5 w-3.5" aria-hidden />Branding
        </Link>
        {isOwner && (
          <Button
            variant="ghost" size="sm"
            className={cn("ml-auto", confirmDelete ? "text-destructive hover:text-destructive" : "text-muted-foreground")}
            disabled={isDeleting}
            onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteWs(ws.id); }}
            onBlur={() => setConfirmDelete(false)}
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {confirmDelete ? "Click again to delete" : "Delete workspace"}
          </Button>
        )}
      </footer>
    </article>
  );
}

// Page ───────────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { data: session } = useSession();
  const { data, isLoading, error, refetch } = useWorkspaces();
  const { mutate: createWs, isPending: isCreating } = useCreateWorkspace();
  const [newName, setNewName] = useState("");

  const workspaces = data?.workspaces ?? [];
  const currentUserId = session?.user?.id ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-10 sm:px-6">
        <header>
          <h1 className="text-4xl tracking-tight">Workspaces</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Shared spaces for each client or team, with their own members and branding.
          </p>
        </header>

        <div className="mt-8">
          <PlanGate requiredPlan="pro" feature="Workspaces">
            <>
              {/* Create */}
              <form
                className="flex max-w-xl flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newName.trim()) return;
                  createWs(newName.trim());
                  setNewName("");
                }}
              >
                <label className="sr-only" htmlFor="new-workspace">New workspace name</label>
                <input
                  id="new-workspace"
                  placeholder="New workspace name, e.g. Acme Corp"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={cn(inputCls, "h-10 min-w-0 flex-1")}
                />
                <Button type="submit" size="lg" disabled={isCreating || !newName.trim()}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {isCreating ? "Creating…" : "Create workspace"}
                </Button>
              </form>

              {error && (
                <div role="alert" className="mt-8 flex items-center gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Couldn’t load your workspaces.
                  <button onClick={() => refetch()} className="font-medium underline-offset-4 hover:underline">Try again</button>
                </div>
              )}

              {isLoading && (
                <div aria-hidden className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {[0, 1].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
                </div>
              )}

              {!isLoading && !error && workspaces.length === 0 && (
                <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
                  <h2 className="text-lg font-semibold">No workspaces yet</h2>
                  <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                    Create one above for each client, then invite their team and add their logo and colors.
                  </p>
                </div>
              )}

              {workspaces.length > 0 && (
                <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                  {workspaces.map((ws) => <WorkspaceCard key={ws.id} ws={ws} currentUserId={currentUserId} />)}
                </div>
              )}
            </>
          </PlanGate>
        </div>
      </main>
    </div>
  );
}
