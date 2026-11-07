"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Layers, Radio, CheckCircle2, Archive, Clock, Search,
  ChevronDown, ChevronRight, Users, BarChart2, Sparkles,
} from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BrandAuditResult } from "@/lib/types/brand-audit";

const ADMIN_EMAIL = "rileymdr@gmail.com";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminSubculture {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  status: "draft" | "approved" | "archived";
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
  const [tab, setTab] = useState<"library" | "audits">("library");

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
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Radio className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin</h1>
            <p className="text-xs text-muted-foreground">CulturePulse internal view — {ADMIN_EMAIL}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {([
            { key: "library", label: "Subculture Library", icon: Layers },
            { key: "audits",  label: "Audit History",      icon: BarChart2 },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === key
                  ? "border-indigo-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "library" && <LibraryTab />}
        {tab === "audits"  && <AuditsTab />}
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
              filter === s ? "border-indigo-500/50 bg-indigo-500/5" : "border-border bg-card hover:border-border/80"
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
                        <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
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
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                <div className="px-4 pb-4 space-y-4 border-t border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground pt-3 leading-relaxed">{log.result.audience_summary}</p>

                  {/* Matched subcultures */}
                  {log.result.matched_subcultures?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Layers className="h-3 w-3" /> Library matches
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {log.result.matched_subcultures.map((s) => (
                          <span key={s.slug} className="px-2 py-0.5 rounded-full bg-indigo-500/8 text-indigo-500 border border-indigo-500/15 text-[11px] font-medium">
                            {s.name} · {s.match_pct}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discovered subcultures */}
                  {log.result.discovered_subcultures?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-amber-500" /> New discoveries
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {log.result.discovered_subcultures.map((s) => (
                          <span key={s.provisional_slug} className="px-2 py-0.5 rounded-full bg-amber-500/8 text-amber-700 dark:text-amber-400 border border-amber-500/15 text-[11px] font-medium">
                            {s.name} · ~{s.estimated_audience_pct}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dominant themes */}
                  {log.result.dominant_themes?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.result.dominant_themes.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">{t}</span>
                      ))}
                    </div>
                  )}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminSubculture["status"] }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
      status === "approved" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25" :
      status === "archived" ? "bg-muted text-muted-foreground border-border" :
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
    )}>
      {status === "approved" && <CheckCircle2 className="h-2.5 w-2.5" />}
      {status === "archived" && <Archive className="h-2.5 w-2.5" />}
      {status === "draft"    && <Clock className="h-2.5 w-2.5" />}
      {status}
    </span>
  );
}
