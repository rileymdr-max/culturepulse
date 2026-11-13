"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Layers, Radio, CheckCircle2, Archive, Clock, Search,
  ChevronDown, ChevronRight, Users, BarChart2, Sparkles, Eye, EyeOff,
  MonitorPlay, FileText, ScanFace, RefreshCw, Check,
} from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BrandAuditResult } from "@/lib/types/brand-audit";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";

const ADMIN_EMAIL = "rileymdr@gmail.com";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminSubculture {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  status: "draft" | "approved" | "archived";
  demoVisible: boolean;
  generatedByAi: boolean;
  enrichedByApify: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { monitors: number; briefs: number };
}

interface AuditLogEntry {
  id: string;
  handle: string;
  platform: string;
  createdAt: string;
  result: BrandAuditResult;
  user: { email: string; name: string | null };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"signups" | "library" | "audits" | "demo">("library");
  const [pendingCount, setPendingCount] = useState(0);

  // Deep link from the "new sign-up" email: /dashboard/admin?tab=signups
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "signups" || t === "library" || t === "audits" || t === "demo") setTab(t);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && session?.user?.email !== ADMIN_EMAIL) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading" || session?.user?.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Radio className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl text-foreground">Admin</h1>
            <p className="text-xs text-muted-foreground">CulturePulse internal view — {ADMIN_EMAIL}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {([
            { key: "signups", label: pendingCount ? `Sign-ups (${pendingCount})` : "Sign-ups", icon: Users },
            { key: "library", label: "Subculture Library", icon: Layers },
            { key: "audits",  label: "Audit History",      icon: BarChart2 },
            { key: "demo",    label: "Demo",                icon: ScanFace },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <SignupsTab visible={tab === "signups"} onPendingCount={setPendingCount} />
        {tab === "library" && <LibraryTab />}
        {tab === "audits"  && <AuditsTab />}
        {tab === "demo"    && <DemoTab />}
      </main>
    </div>
  );
}

// ─── Library tab ──────────────────────────────────────────────────────────────

function LibraryTab() {
  const [subcultures, setSubcultures] = useState<AdminSubculture[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "approved" | "archived">("all");
  const [query, setQuery] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/library")
      .then((r) => r.json())
      .then((d) => setSubcultures(d.subcultures ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function setStatus(id: string, status: AdminSubculture["status"]) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/library?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSubcultures((prev) => prev.map((s) => s.id === id ? { ...s, status: updated.status } : s));
      }
    } finally {
      setUpdating(null);
    }
  }

  async function toggleDemoVisible(id: string, current: boolean) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/library?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoVisible: !current }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSubcultures((prev) => prev.map((s) => s.id === id ? { ...s, demoVisible: updated.demoVisible } : s));
      }
    } finally {
      setUpdating(null);
    }
  }

  const filtered = subcultures.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: subcultures.length,
    draft: subcultures.filter((s) => s.status === "draft").length,
    approved: subcultures.filter((s) => s.status === "approved").length,
    archived: subcultures.filter((s) => s.status === "archived").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["all", "approved", "draft", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              filter === s ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-border/80"
            )}
          >
            <p className="text-xl font-bold text-foreground">{counts[s]}</p>
            <p className="text-xs text-muted-foreground capitalize">{s === "all" ? "Total" : s}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or category…"
          className="w-full pl-8 pr-4 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">Category</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Demo</th>
                <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Usage</th>
                <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Added</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{s.name}</span>
                      {s.generatedByAi && (
                        <Sparkles className="h-3 w-3 text-tier-trending shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5 sm:hidden">{s.category}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{s.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <button
                      title={s.demoVisible ? "Visible in demo — click to hide" : "Hidden from demo — click to show"}
                      disabled={updating === s.id}
                      onClick={() => toggleDemoVisible(s.id, s.demoVisible)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors",
                        s.demoVisible
                          ? "text-primary hover:bg-primary/10"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {s.demoVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {s.demoVisible ? "On" : "Off"}
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                    {s._count.monitors} monitors · {s._count.briefs} briefs
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {s.status !== "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updating === s.id}
                          onClick={() => setStatus(s.id, "approved")}
                          className="h-7 px-2 text-xs text-green-600 border-green-500/30 hover:bg-green-500/5"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      )}
                      {s.status !== "archived" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updating === s.id}
                          onClick={() => setStatus(s.id, "archived")}
                          className="h-7 px-2 text-xs text-muted-foreground"
                        >
                          <Archive className="h-3 w-3 mr-1" />
                          Archive
                        </Button>
                      )}
                      {s.status === "archived" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updating === s.id}
                          onClick={() => setStatus(s.id, "draft")}
                          className="h-7 px-2 text-xs text-muted-foreground"
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No subcultures match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sign-ups tab ─────────────────────────────────────────────────────────────

interface SignupUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  approvedAt: string | null;
  plan: string;
  stripeSubscriptionId: string | null;
}

/** Always mounted (so the tab label can show the pending count); renders only when visible. */
function SignupsTab({ visible, onPendingCount }: { visible: boolean; onPendingCount: (n: number) => void }) {
  const [pending, setPending] = useState<SignupUser[]>([]);
  const [approved, setApproved] = useState<SignupUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () =>
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setPending(d.pending ?? []);
        setApproved(d.approved ?? []);
        onPendingCount(d.pending?.length ?? 0);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(user: SignupUser, action: "approve" | "decline" | "remove") {
    if (action === "decline" && !window.confirm(`Decline ${user.email}? Their pending account will be deleted.`)) return;
    if (
      action === "remove" &&
      !window.confirm(`Remove ${user.email}? Their account and everything in it (monitors, briefs, audits) will be permanently deleted.`)
    )
      return;
    setBusy(user.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) setNotice(d.error ?? "Something went wrong.");
      else if (action === "approve")
        setNotice(
          d.emailed
            ? `Approved ${user.email}. They've been emailed.`
            : `Approved ${user.email}, but the email didn't send. Let them know they can sign in.`
        );
      else setNotice(action === "remove" ? `Removed ${user.email}.` : `Declined ${user.email}.`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function setPlan(user: SignupUser, plan: string) {
    setBusy(user.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPlan", plan }),
      });
      const d = await res.json();
      setNotice(res.ok ? `${user.email} is now on ${PLANS[plan as PlanId].name}.` : d.error ?? "Something went wrong.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!visible) return null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-8">
      {notice && <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">{notice}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Waiting for approval</h2>
        {loading ? (
          <Skeleton className="h-14 rounded-lg" />
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one is waiting. New sign-ups appear here and you&rsquo;ll get an email.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {pending.map((u) => (
              <div key={u.id} className="bg-card flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium text-foreground">{u.name ?? "No name"}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · signed up {fmt(u.createdAt)}</p>
                </div>
                <Button size="sm" disabled={busy === u.id} onClick={() => act(u, "approve")}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => act(u, "decline")}>
                  Decline
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Recently approved</h2>
        {!loading && (
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {approved.map((u) => (
              <div key={u.id} className="bg-card flex flex-wrap items-center gap-3 px-4 py-2.5">
                <p className="flex-1 min-w-[200px] text-sm text-foreground">
                  {u.name ?? "No name"} <span className="text-muted-foreground">· {u.email}</span>
                </p>
                <p className="text-xs text-muted-foreground">approved {u.approvedAt ? fmt(u.approvedAt) : ""}</p>
                {u.email !== ADMIN_EMAIL && (
                  <select
                    aria-label={`Plan for ${u.email}`}
                    value={u.plan}
                    disabled={busy === u.id || !!u.stripeSubscriptionId}
                    title={u.stripeSubscriptionId ? "Pays through Stripe; change the plan there" : "Set plan by hand (Enterprise, comps)"}
                    onChange={(e) => setPlan(u, e.target.value)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {PLAN_ORDER.map((id) => (
                      <option key={id} value={id}>{PLANS[id].name}</option>
                    ))}
                  </select>
                )}
                {u.email !== ADMIN_EMAIL && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === u.id}
                    onClick={() => act(u, "remove")}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Audits tab ───────────────────────────────────────────────────────────────

function AuditsTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/audits")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = query
    ? logs.filter((l) => l.handle.toLowerCase().includes(query.toLowerCase()) || l.user.email.includes(query.toLowerCase()))
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by handle or user…"
            className="w-full pl-8 pr-4 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{filtered.length} audits</span>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {filtered.map((log) => (
            <div key={log.id} className="bg-card">
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
              >
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">@{log.handle}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">{log.platform}</span>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">{log.user.email}</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {log.result.matched_subcultures?.length ?? 0} matches · {log.result.discovered_subcultures?.length ?? 0} new
                  </span>
                  {expanded === log.id
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </div>
              </button>

              {expanded === log.id && (
                <div className="border-t border-border bg-muted/20">
                  <AuditResultInline result={log.result} logId={log.id} />
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {logs.length === 0 ? "No audits run yet — they'll appear here after the first run." : "No results for that search."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Demo tab ────────────────────────────────────────────────────────────────

interface DemoMonitor {
  id: string;
  demoVisible: boolean;
  status: string;
  platforms: string[];
  lastRunAt: string | null;
  createdAt: string;
  subculture: { name: string; category: string; slug: string };
}

interface DemoBrief {
  id: string;
  demoVisible: boolean;
  headline: string;
  urgency: string;
  createdAt: string;
  subculture: { name: string; slug: string };
}

interface DemoAudit {
  id: string;
  demoVisible: boolean;
  handle: string;
  platform: string;
  createdAt: string;
}

function DemoTab() {
  const [monitors, setMonitors] = useState<DemoMonitor[]>([]);
  const [briefs, setBriefs] = useState<DemoBrief[]>([]);
  const [audits, setAudits] = useState<DemoAudit[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ monitors: number; briefs: number; audits: number } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/demo")
      .then((r) => r.json())
      .then((d) => {
        setMonitors(d.monitors ?? []);
        setBriefs(d.briefs ?? []);
        setAudits(d.audits ?? []);
        setLastSyncAt(d.lastSyncAt ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggle(type: "monitor" | "brief" | "audit", id: string, current: boolean) {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/demo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, demoVisible: !current }),
      });
      if (!res.ok) return;
      if (type === "monitor") setMonitors((prev) => prev.map((m) => m.id === id ? { ...m, demoVisible: !current } : m));
      if (type === "brief")   setBriefs((prev) => prev.map((b) => b.id === id ? { ...b, demoVisible: !current } : b));
      if (type === "audit")   setAudits((prev) => prev.map((a) => a.id === id ? { ...a, demoVisible: !current } : a));
    } finally {
      setUpdating(null);
    }
  }

  async function runSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/demo/sync", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setSyncResult(d.synced);
        if (d.lastSyncAt) setLastSyncAt(d.lastSyncAt);
      }
    } finally {
      setSyncing(false);
    }
  }

  const demoCount = {
    monitors: monitors.filter((m) => m.demoVisible).length,
    briefs: briefs.filter((b) => b.demoVisible).length,
    audits: audits.filter((a) => a.demoVisible).length,
  };

  return (
    <div className="space-y-8">
      {/* Header / sync button */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Demo account content</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-lg">
            Toggle which of your monitors, briefs, and audit runs appear when visitors use the live demo.
            Click "Update demo now" to push your selections — the demo only updates when you do this.
          </p>
          {lastSyncAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Last synced: {new Date(lastSyncAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={runSync} disabled={syncing} className="shrink-0">
            {syncing
              ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing…</>
              : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Update demo now</>
            }
          </Button>
          {syncResult && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3 text-primary" />
              Pushed {syncResult.monitors} monitors · {syncResult.briefs} briefs · {syncResult.audits} audits
            </p>
          )}
        </div>
      </div>

      {/* Summary chips */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Monitors in demo", count: demoCount.monitors, total: monitors.length },
            { label: "Briefs in demo", count: demoCount.briefs, total: briefs.length },
            { label: "Audits in demo", count: demoCount.audits, total: audits.length },
          ].map(({ label, count, total }) => (
            <div key={label} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <span className="font-semibold text-foreground">{count}</span>
              <span className="text-muted-foreground"> / {total} {label.toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : (
        <>
          {/* Monitors */}
          <DemoSection
            title="Monitors"
            icon={<MonitorPlay className="h-3.5 w-3.5" />}
            empty="No monitors yet — set up monitors on the Signal Board."
          >
            {monitors.map((m) => (
              <DemoRow
                key={m.id}
                visible={m.demoVisible}
                busy={updating === m.id}
                onToggle={() => toggle("monitor", m.id, m.demoVisible)}
                primary={m.subculture.name}
                secondary={`${m.subculture.category} · ${m.platforms.join(", ")}`}
                meta={m.lastRunAt ? `Last run ${new Date(m.lastRunAt).toLocaleDateString()}` : "Never run"}
              />
            ))}
          </DemoSection>

          {/* Briefs */}
          <DemoSection
            title="Content Briefs"
            icon={<FileText className="h-3.5 w-3.5" />}
            empty="No briefs yet — generate briefs from subculture profiles."
          >
            {briefs.map((b) => (
              <DemoRow
                key={b.id}
                visible={b.demoVisible}
                busy={updating === b.id}
                onToggle={() => toggle("brief", b.id, b.demoVisible)}
                primary={b.headline}
                secondary={b.subculture.name}
                meta={new Date(b.createdAt).toLocaleDateString()}
                urgency={b.urgency}
              />
            ))}
          </DemoSection>

          {/* Audits */}
          <DemoSection
            title="Brand Audit Runs"
            icon={<BarChart2 className="h-3.5 w-3.5" />}
            empty="No audit runs yet — run audits from the Audience Audit page."
          >
            {audits.map((a) => (
              <DemoRow
                key={a.id}
                visible={a.demoVisible}
                busy={updating === a.id}
                onToggle={() => toggle("audit", a.id, a.demoVisible)}
                primary={`@${a.handle}`}
                secondary={a.platform}
                meta={new Date(a.createdAt).toLocaleDateString()}
              />
            ))}
          </DemoSection>
        </>
      )}
    </div>
  );
}

function DemoSection({ title, icon, children, empty }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  empty: string;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {icon}{title}
      </h3>
      {hasChildren ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {children}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground pl-1">{empty}</p>
      )}
    </section>
  );
}

const URGENCY_LABEL: Record<string, string> = {
  "act-now": "Act now",
  "this-week": "This week",
  "monitor": "Monitor",
};

function DemoRow({ visible, busy, onToggle, primary, secondary, meta, urgency }: {
  visible: boolean;
  busy: boolean;
  onToggle: () => void;
  primary: string;
  secondary: string;
  meta?: string;
  urgency?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 bg-card transition-colors", visible ? "" : "opacity-60")}>
      <button
        disabled={busy}
        onClick={onToggle}
        title={visible ? "In demo — click to remove" : "Not in demo — click to include"}
        className={cn(
          "shrink-0 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors",
          visible ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
        )}
      >
        {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        {visible ? "On" : "Off"}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{primary}</p>
        <p className="text-xs text-muted-foreground truncate">{secondary}</p>
      </div>
      <div className="shrink-0 text-right">
        {urgency && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5 mr-2">
            {URGENCY_LABEL[urgency] ?? urgency}
          </span>
        )}
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </div>
    </div>
  );
}

// ─── AuditResultInline ────────────────────────────────────────────────────────

function AuditResultInline({ result, logId }: { result: BrandAuditResult; logId: string }) {
  const stats = [
    { label: "Audience size", value: result.audience_size?.toLocaleString() ?? "—" },
    { label: "Lib. matches",  value: String(result.matched_subcultures?.length ?? 0) },
    { label: "New discoveries", value: String(result.discovered_subcultures?.length ?? 0) },
    { label: "Top platform",  value: result.primary_platforms?.[0] ?? "—" },
  ];

  return (
    <div className="px-4 pb-4 pt-3 space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Audience summary */}
      {result.audience_summary && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{result.audience_summary}</p>
      )}

      {/* Matched subcultures */}
      {result.matched_subcultures?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {result.matched_subcultures.map((s) => (
            <span key={s.slug} className="px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15 text-[10px] font-medium">
              {s.name} · {s.match_pct}%
            </span>
          ))}
        </div>
      )}

      {/* Discoveries */}
      {result.discovered_subcultures?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {result.discovered_subcultures.map((s) => (
            <span key={s.provisional_slug} className="px-2 py-0.5 rounded-full bg-[#FFE14D]/40 text-foreground border border-foreground/20 text-[10px] font-medium">
              ✦ {s.name} · ~{s.estimated_audience_pct}%
            </span>
          ))}
        </div>
      )}

      {/* Full profile link */}
      <div className="pt-1">
        <a
          href={`/dashboard/brand-audit?id=${logId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View full profile <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminSubculture["status"] }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
      status === "approved" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25" :
      status === "archived" ? "bg-muted text-muted-foreground border-border" :
      "bg-[#FFE14D]/40 text-foreground border-foreground/20"
    )}>
      {status === "approved" && <CheckCircle2 className="h-2.5 w-2.5" />}
      {status === "archived" && <Archive className="h-2.5 w-2.5" />}
      {status === "draft"    && <Clock className="h-2.5 w-2.5" />}
      {status}
    </span>
  );
}
