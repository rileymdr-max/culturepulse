"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, Minus, Trash2, Pause, Play,
  AlertCircle, BookOpen, ChevronRight, Zap, Radio, FileText, Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useMonitors,
  useDeleteMonitor,
  usePauseMonitor,
  type MonitorData,
  type AccelerationSignal,
  type MonitorTopPost,
} from "@/hooks/use-monitors";
import { useCreateBrief } from "@/hooks/use-briefs";

// ─── Score tier helpers ──────────────────────────────────────────────────────

type Tier = "breakout" | "trending" | "rising" | "stable" | "cooling";

function getTier(signal: AccelerationSignal): Tier {
  if (signal.isBreakout) return "breakout";
  if (signal.breakoutScore >= 55) return "trending";
  if (signal.breakoutScore >= 35 || signal.velocity > 5) return "rising";
  if (signal.velocity < -5) return "cooling";
  return "stable";
}

const TIER_BORDER: Record<Tier, string> = {
  breakout: "border-red-500/40 shadow-red-500/10 shadow-md",
  trending: "border-amber-500/40",
  rising:   "border-indigo-500/30",
  stable:   "border-border",
  cooling:  "border-border opacity-70",
};

const TIER_BADGE: Record<Tier, { label: string; cls: string }> = {
  breakout: { label: "BREAKOUT",  cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  trending: { label: "TRENDING",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  rising:   { label: "RISING",    cls: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30" },
  stable:   { label: "STABLE",    cls: "bg-muted text-muted-foreground border-border" },
  cooling:  { label: "COOLING",   cls: "bg-muted/50 text-muted-foreground/60 border-border/50" },
};

const SCORE_COLOR: Record<Tier, string> = {
  breakout: "text-red-400",
  trending: "text-amber-400",
  rising:   "text-indigo-500",
  stable:   "text-muted-foreground",
  cooling:  "text-muted-foreground/50",
};

function MomentumIcon({ momentum }: { momentum: AccelerationSignal["momentum"] }) {
  if (momentum === "rising")  return <TrendingUp  className="h-4 w-4 text-green-400" />;
  if (momentum === "falling") return <TrendingDown className="h-4 w-4 text-red-400/70" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

// ─── Chart data ───────────────────────────────────────────────────────────────

function buildChartData(snapshots: MonitorData["snapshots"]) {
  const byRun = new Map<string, { reddit?: number; twitter?: number }>();

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  for (const s of sorted) {
    const key = new Date(s.capturedAt).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const existing = byRun.get(key) ?? {};
    if (s.platform === "reddit")  existing.reddit  = s.postCount;
    if (s.platform === "twitter") existing.twitter = s.postCount;
    byRun.set(key, existing);
  }

  return Array.from(byRun.entries()).slice(-8).map(([name, v]) => ({ name, ...v }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: { dataKey: string; value: number; color: string }) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey}: <strong>{p.value} posts</strong>
        </p>
      ))}
    </div>
  );
}

function VolumeChart({ snapshots }: { snapshots: MonitorData["snapshots"] }) {
  const data = buildChartData(snapshots);
  if (data.length < 2) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground/50">
        waiting for data — cron runs every 6 hours
      </div>
    );
  }

  const hasReddit  = data.some((d) => d.reddit  !== undefined);
  const hasTwitter = data.some((d) => d.twitter !== undefined);

  return (
    <ResponsiveContainer width="100%" height={64}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id="gReddit"  x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gTwitter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" vertical={false} />
        <XAxis dataKey="name" hide />
        <YAxis hide />
        <Tooltip content={<ChartTooltip />} />
        {hasReddit  && <Area type="monotone" dataKey="reddit"  stroke="#f97316" fill="url(#gReddit)"  strokeWidth={1.5} dot={false} />}
        {hasTwitter && <Area type="monotone" dataKey="twitter" stroke="#38bdf8" fill="url(#gTwitter)" strokeWidth={1.5} dot={false} />}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Cross-platform strength bar ─────────────────────────────────────────────

function StrengthBar({ value }: { value: number }) {
  const filled = Math.round(value / 10);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-2.5 rounded-sm",
              i < filled ? "bg-indigo-500" : "bg-muted/60"
            )}
          />
        ))}
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
    </div>
  );
}

// ─── Monitor card ─────────────────────────────────────────────────────────────

function MonitorCard({ monitor }: { monitor: MonitorData }) {
  const { mutate: deleteMonitor, isPending: isDeleting } = useDeleteMonitor();
  const { mutate: setStatus, isPending: isToggling } = usePauseMonitor();
  const { mutate: createBrief, isPending: isGeneratingBrief, data: briefResult } = useCreateBrief();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { signal } = monitor;
  const tier = getTier(signal);
  const { label: tierLabel, cls: tierCls } = TIER_BADGE[tier];
  const scoreColor = SCORE_COLOR[tier];
  const isActive = monitor.status === "active";

  const lastSnap = monitor.snapshots[0] ?? null;
  const topPosts: MonitorTopPost[] = Array.isArray(lastSnap?.topPosts)
    ? (lastSnap.topPosts as MonitorTopPost[])
    : [];

  const lastRun = monitor.lastRunAt
    ? new Date(monitor.lastRunAt).toLocaleString(undefined, {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "Never run";

  return (
    <Card className={cn("transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg", TIER_BORDER[tier], !isActive && "opacity-50")}>
      <CardContent className="p-5 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border tracking-wider", tierCls)}>
                {tierLabel}
              </span>
              <Link
                href={`/dashboard/subcultures/${monitor.subculture.slug}`}
                className="font-semibold text-foreground hover:text-indigo-500 transition-colors"
              >
                {monitor.subculture.name}
              </Link>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                {monitor.subculture.category}
              </span>
              {!isActive && <span className="text-xs text-amber-400/70">paused</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {monitor.platforms.map((p) => (
                <span key={p} className={cn(
                  "text-[11px] px-1.5 py-0.5 rounded border",
                  p === "reddit"  ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                )}>
                  {p}
                </span>
              ))}
              <span className="text-[11px] text-muted-foreground/50 ml-1">· {lastRun}</span>
            </div>
          </div>

          {/* Breakout Score circle */}
          <div className="text-center shrink-0">
            <div className={cn("text-3xl font-black tabular-nums leading-none", scoreColor)}>
              {signal.breakoutScore}
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">score</div>
          </div>
        </div>

        {/* ── Score breakdown ── */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          {/* Velocity */}
          <div className="text-center">
            <div className={cn("text-lg font-bold tabular-nums", scoreColor)}>
              {signal.velocity > 0 ? "+" : ""}{signal.velocity}%
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">velocity</div>
          </div>

          {/* Momentum */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1">
              <MomentumIcon momentum={signal.momentum} />
              <span className="text-xs font-medium capitalize">{signal.momentum}</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">momentum</div>
          </div>

          {/* Cross-platform */}
          <div className="flex flex-col items-center gap-1">
            <StrengthBar value={signal.crossPlatformStrength} />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">cross-platform</div>
          </div>
        </div>

        {/* Per-platform velocity detail */}
        {(signal.platform.reddit.velocity !== null || signal.platform.twitter.velocity !== null) && (
          <div className="flex gap-3 text-xs">
            {signal.platform.reddit.velocity !== null && (
              <span className="text-orange-400/80">
                Reddit {signal.platform.reddit.velocity > 0 ? "+" : ""}{signal.platform.reddit.velocity}%
              </span>
            )}
            {signal.platform.twitter.velocity !== null && (
              <span className="text-sky-400/80">
                Twitter {signal.platform.twitter.velocity > 0 ? "+" : ""}{signal.platform.twitter.velocity}%
              </span>
            )}
          </div>
        )}

        {/* ── Volume chart ── */}
        <VolumeChart snapshots={monitor.snapshots} />

        {/* ── Top posts ── */}
        {topPosts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Latest {lastSnap?.platform} posts
            </p>
            {topPosts.slice(0, 3).map((post, i) => (
              <a
                key={i}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 group text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-muted-foreground/30 shrink-0 mt-0.5">↗</span>
                <span className="line-clamp-1 group-hover:text-indigo-500 transition-colors flex-1">{post.title}</span>
                {post.score > 0 && (
                  <span className="shrink-0 text-muted-foreground/50">{post.score.toLocaleString()}</span>
                )}
              </a>
            ))}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/50 flex-wrap">
          <Link href={`/dashboard/subcultures/${monitor.subculture.slug}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" />Profile
            </Button>
          </Link>

          {/* Generate Brief */}
          {briefResult?.brief ? (
            <Link href={`/dashboard/briefs/${briefResult.brief.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs border-indigo-500/40 text-indigo-500 hover:text-indigo-400">
                <FileText className="h-3.5 w-3.5" />View Brief
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost" size="sm" className="gap-1.5 text-xs"
              disabled={isGeneratingBrief}
              onClick={() => createBrief({ subcultureId: monitor.subculture.id, monitorId: monitor.id })}
            >
              {isGeneratingBrief
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
                : <><FileText className="h-3.5 w-3.5" />Brief</>
              }
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost" size="sm" className="text-xs gap-1.5"
              disabled={isToggling}
              onClick={() => setStatus({ id: monitor.id, status: isActive ? "paused" : "active" })}
            >
              {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isActive ? "Pause" : "Resume"}
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn("text-xs gap-1.5", confirmDelete ? "text-red-400 hover:text-red-300" : "text-muted-foreground")}
              disabled={isDeleting}
              onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteMonitor(monitor.id); }}
              onBlur={() => setConfirmDelete(false)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmDelete ? "Confirm?" : "Remove"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SortKey = "score" | "velocity" | "added";

export default function SignalBoardPage() {
  const { data, isLoading, error } = useMonitors();
  const [sort, setSort] = useState<SortKey>("score");

  const monitors = [...(data?.monitors ?? [])];

  if (sort === "score")    monitors.sort((a, b) => b.signal.breakoutScore - a.signal.breakoutScore);
  if (sort === "velocity") monitors.sort((a, b) => b.signal.velocity - a.signal.velocity);
  if (sort === "added")    monitors.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const breakouts = monitors.filter((m) => m.signal.isBreakout).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-400" />
              Signal Board
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Subcultures ranked by Breakout Score = Velocity × Momentum × Cross-Platform strength.
              {breakouts > 0 && (
                <span className="ml-2 text-red-400 font-medium">
                  {breakouts} breakout signal{breakouts !== 1 ? "s" : ""} detected.
                </span>
              )}
            </p>
          </div>

          {/* Sort controls */}
          {monitors.length > 1 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground mr-1">Sort:</span>
              {(["score", "velocity", "added"] as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={cn(
                    "px-2.5 py-1 rounded-md border transition-colors capitalize",
                    sort === k
                      ? "bg-accent text-foreground border-border"
                      : "text-muted-foreground border-transparent hover:border-border/50"
                  )}
                >
                  {k === "score" ? "Breakout Score" : k === "velocity" ? "Velocity" : "Date Added"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
            <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load monitors.
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-12 w-16 rounded-lg" />
                </div>
                <Skeleton className="h-16 w-full rounded-md" />
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && monitors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Radio className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No active monitors</p>
            <p className="text-sm text-muted-foreground/60 mt-1 mb-6">
              Open a subculture profile and click &ldquo;Start Monitoring&rdquo; to begin tracking.
            </p>
            <Link href="/dashboard/subcultures">
              <Button variant="outline" className="gap-2">
                <BookOpen className="h-4 w-4" />Browse Library
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Score legend */}
        {monitors.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
            <span className="font-medium">Score:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Breakout ≥70</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Trending 55–69</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" />Rising 35–54</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/40" />Stable &lt;35</span>
            <span className="ml-auto text-muted-foreground/50">{monitors.length} monitor{monitors.length !== 1 ? "s" : ""} · cron every 6h</span>
          </div>
        )}

        {/* Monitor cards */}
        {monitors.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {monitors.map((m) => <MonitorCard key={m.id} monitor={m} />)}
          </div>
        )}
      </main>
    </div>
  );
}
