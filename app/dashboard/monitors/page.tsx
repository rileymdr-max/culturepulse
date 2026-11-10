"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Minus, Trash2, Pause, Play,
  AlertCircle, BookOpen, ArrowUpRight, FileText, Loader2, RefreshCw, Check,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { signalTier, TIER_STYLE } from "@/lib/signal-tier";
import { useTokenColors } from "@/hooks/use-token-color";
import {
  useMonitors,
  useDeleteMonitor,
  usePauseMonitor,
  useRunMonitor,
  type MonitorData,
  type AccelerationSignal,
  type MonitorTopPost,
} from "@/hooks/use-monitors";
import { useCreateBrief } from "@/hooks/use-briefs";
import { useQueryClient } from "@tanstack/react-query";

const PLATFORM_LABEL: Record<string, string> = {
  reddit: "Reddit",
  twitter: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  trends: "Google Trends",
};
// Platforms whose postCount is a post/video count (Trends is search interest, so it's left off the volume chart).
const VOLUME_PLATFORMS = ["reddit", "twitter", "tiktok", "youtube", "instagram"] as const;
const VELOCITY_PLATFORMS = [...VOLUME_PLATFORMS, "trends"] as const;
const platformLabel = (p: string) => PLATFORM_LABEL[p] ?? p.charAt(0).toUpperCase() + p.slice(1);

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;

// ─── Chart ────────────────────────────────────────────────────────────────────

function buildChartData(snapshots: MonitorData["snapshots"]) {
  const byRun = new Map<string, Partial<Record<string, number>>>();
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );
  for (const s of sorted) {
    const key = new Date(s.capturedAt).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    const existing = byRun.get(key) ?? {};
    if ((VOLUME_PLATFORMS as readonly string[]).includes(s.platform)) existing[s.platform] = s.postCount;
    byRun.set(key, existing);
  }
  return Array.from(byRun.entries()).slice(-8).map(([name, v]) => ({ name, ...v }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p: { dataKey: string; value: number; color: string }) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 tabular-nums">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {platformLabel(p.dataKey)}: <strong className="font-medium">{p.value} posts</strong>
        </p>
      ))}
    </div>
  );
}

function VolumeChart({ snapshots }: { snapshots: MonitorData["snapshots"] }) {
  const colors = useTokenColors(["--primary", "--muted-foreground", "--foreground", "--border"] as const);
  const data = buildChartData(snapshots);

  if (data.length < 2) {
    return (
      <div className="flex h-16 items-center rounded-lg bg-muted px-4 text-sm text-muted-foreground">
        Post-volume chart appears after the second run. Monitors refresh every 6 hours.
      </div>
    );
  }

  // Three theme colours, solid then dashed, so five platforms stay distinguishable.
  const palette = [colors["--primary"], colors["--muted-foreground"], colors["--foreground"]];
  const series = VOLUME_PLATFORMS.map((key, i) => ({
    key,
    color: palette[i % palette.length],
    dash: i >= palette.length ? "4 3" : undefined,
  })).filter((s) => data.some((d) => (d as Record<string, unknown>)[s.key] !== undefined));

  return (
    <div>
      <ResponsiveContainer width="100%" height={72}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={colors["--border"]} vertical={false} />
          <XAxis dataKey="name" hide />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors["--border"] }} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeDasharray={s.dash}
              fill={s.color}
              fillOpacity={s.dash ? 0 : 0.06}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Post volume, last {data.length} runs</span>
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {platformLabel(s.key)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium tabular-nums">{children}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MomentumValue({ momentum }: { momentum: AccelerationSignal["momentum"] }) {
  const Icon = momentum === "rising" ? TrendingUp : momentum === "falling" ? TrendingDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 capitalize", momentum === "falling" && "text-muted-foreground")}>
      <Icon className="h-4 w-4" aria-hidden />
      {momentum}
    </span>
  );
}

function StrengthBar({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </span>
      {value}
    </span>
  );
}

// ─── Monitor card ─────────────────────────────────────────────────────────────

function MonitorCard({ monitor }: { monitor: MonitorData }) {
  const { mutate: deleteMonitor, isPending: isDeleting } = useDeleteMonitor();
  const { mutate: setStatus, isPending: isToggling } = usePauseMonitor();
  const { mutate: runNow, isPending: isRunning } = useRunMonitor();
  const { mutate: createBrief, isPending: isGeneratingBrief, data: briefResult } = useCreateBrief();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { signal } = monitor;
  const tier = signalTier(signal);
  const style = TIER_STYLE[tier];
  const isActive = monitor.status === "active";
  const showTierLabel = tier === "breakout" || tier === "trending" || tier === "rising";

  // Top post from each platform in the latest run (Trends has searches, not posts).
  const latestAt = monitor.snapshots[0] ? new Date(monitor.snapshots[0].capturedAt).getTime() : 0;
  const topPosts: Array<MonitorTopPost & { platform: string }> = VOLUME_PLATFORMS.flatMap((p) => {
    const snap = monitor.snapshots.find(
      (s) => s.platform === p && latestAt - new Date(s.capturedAt).getTime() < 10 * 60_000
    );
    const posts = Array.isArray(snap?.topPosts) ? (snap.topPosts as MonitorTopPost[]) : [];
    return posts.slice(0, 1).map((post) => ({ ...post, platform: p }));
  });

  const lastRun = monitor.lastRunAt
    ? `Updated ${new Date(monitor.lastRunAt).toLocaleString(undefined, {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      })}`
    : "Not run yet";

  const perPlatform = VELOCITY_PLATFORMS.map((p) => ({ p, v: signal.platform[p]?.velocity ?? null })).filter(
    (x): x is { p: (typeof VELOCITY_PLATFORMS)[number]; v: number } => x.v !== null
  );

  return (
    <article
      className={cn(
        "flex flex-col gap-5 rounded-xl border bg-card p-5",
        tier === "breakout" ? "border-tier-breakout/50" : "border-border",
        !isActive && "opacity-60"
      )}
    >
      {/* Header: name + score */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/dashboard/subcultures/${monitor.subculture.slug}`}
              className="truncate text-lg font-semibold tracking-tight transition-colors hover:text-primary"
            >
              {monitor.subculture.name}
            </Link>
            {showTierLabel && <span className={cn("text-xs font-semibold", style.text)}>{style.label}</span>}
            {!isActive && <span className="text-xs font-medium text-muted-foreground">Paused</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {monitor.subculture.category} · {monitor.platforms.map(platformLabel).join(", ")} · {lastRun}
          </p>
        </div>
        <div className="shrink-0 text-right" title="Breakout Score (0–100)">
          <div className={cn("text-4xl font-semibold leading-none tracking-tight tabular-nums", style.text)}>
            {signal.breakoutScore}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Breakout Score</div>
        </div>
      </header>

      {/* Score breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <Metric label="Velocity">
          <span className={cn(signal.velocity > 0 && style.text)}>{signed(signal.velocity)}</span>
        </Metric>
        <Metric label="Momentum">
          <MomentumValue momentum={signal.momentum} />
        </Metric>
        <Metric label="Cross-platform">
          <StrengthBar value={signal.crossPlatformStrength} />
        </Metric>
      </div>
      {perPlatform.length > 0 && (
        <p className="-mt-3 text-xs text-muted-foreground tabular-nums">
          {perPlatform.map(({ p, v }) => `${platformLabel(p)} ${signed(v)}`).join(" · ")}
        </p>
      )}

      <VolumeChart snapshots={monitor.snapshots} />

      {/* Top posts */}
      {topPosts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Latest top posts</h3>
          <ul className="mt-2 space-y-1">
            {topPosts.slice(0, 5).map((post, i) => (
              <li key={i}>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden />
                  <span className="shrink-0 text-xs">{platformLabel(post.platform)}</span>
                  <span className="line-clamp-1 flex-1">{post.title}</span>
                  {post.score > 0 && <span className="shrink-0 text-xs tabular-nums">{post.score.toLocaleString()}</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <footer className="mt-auto flex flex-wrap items-center gap-1 border-t border-border pt-4">
        {briefResult?.brief ? (
          <Link
            href={`/dashboard/briefs/${briefResult.brief.id}`}
            className="mr-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />View brief
          </Link>
        ) : (
          <Button
            size="sm"
            className="mr-1"
            disabled={isGeneratingBrief}
            onClick={() => createBrief({ subcultureId: monitor.subculture.id, monitorId: monitor.id })}
          >
            {isGeneratingBrief ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {isGeneratingBrief ? "Generating brief…" : "Generate brief"}
          </Button>
        )}

        <Button
          variant="ghost" size="sm"
          disabled={isRunning || !isActive}
          onClick={() => runNow(monitor.id)}
          title={!isActive ? "Resume this monitor to run it" : undefined}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
          {isRunning ? "Running…" : "Run now"}
        </Button>

        <Link
          href={`/dashboard/subcultures/${monitor.subculture.slug}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden />Profile
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            disabled={isToggling}
            onClick={() => setStatus({ id: monitor.id, status: isActive ? "paused" : "active" })}
          >
            {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isActive ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="ghost" size="sm"
            className={cn(confirmDelete ? "text-destructive hover:text-destructive" : "text-muted-foreground")}
            disabled={isDeleting}
            onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteMonitor(monitor.id); }}
            onBlur={() => setConfirmDelete(false)}
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {confirmDelete ? "Click again to remove" : "Remove"}
          </Button>
        </div>
      </footer>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SortKey = "score" | "velocity" | "added";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Breakout Score" },
  { key: "velocity", label: "Velocity" },
  { key: "added", label: "Newest" },
];

function useNextCronRun(): string {
  // Cron runs every 6h at :00 UTC — compute time until next slot
  const now = new Date();
  const nextHour = Math.ceil(now.getUTCHours() / 6) * 6;
  const next = new Date(now);
  next.setUTCHours(nextHour % 24, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const diffMs = next.getTime() - now.getTime();
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function CardSkeleton() {
  return (
    <div aria-hidden className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-14" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9" />)}
      </div>
      <Skeleton className="h-[72px] w-full rounded-lg" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export default function SignalBoardPage() {
  const { data, isLoading, error, refetch } = useMonitors();
  const [sort, setSort] = useState<SortKey>("score");
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllResult, setRunAllResult] = useState<{ ran: number; failed: number; skipped: number } | null>(null);
  const queryClient = useQueryClient();
  const nextRun = useNextCronRun();

  const handleRunAll = useCallback(async () => {
    setIsRunningAll(true);
    setRunAllResult(null);
    try {
      const res = await fetch("/api/monitors/run-mine", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRunAllResult(json);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    } catch {
      setRunAllResult({ ran: 0, failed: 1, skipped: 0 });
    } finally {
      setIsRunningAll(false);
    }
  }, [refetch, queryClient]);

  const monitors = [...(data?.monitors ?? [])];
  if (sort === "score") monitors.sort((a, b) => b.signal.breakoutScore - a.signal.breakoutScore);
  if (sort === "velocity") monitors.sort((a, b) => b.signal.velocity - a.signal.velocity);
  if (sort === "added") monitors.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const breakouts = monitors.filter((m) => m.signal.isBreakout).length;
  const n = monitors.length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-10 sm:px-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Signal Board</h1>
            <div className="mt-2 text-muted-foreground">
              {isLoading ? (
                <Skeleton className="inline-block h-5 w-72 align-middle" />
              ) : n === 0 ? (
                "Track a subculture to see its Breakout Score here."
              ) : (
                <>
                  {breakouts > 0 ? (
                    <span className="font-medium text-signal">
                      <span className="tabular-nums">{breakouts}</span> breakout{breakouts !== 1 && "s"}
                    </span>
                  ) : (
                    "No breakouts"
                  )}{" "}
                  across <span className="tabular-nums">{n}</span> monitored subculture{n !== 1 && "s"}.
                </>
              )}
            </div>
          </div>

          {n > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground tabular-nums">Next auto-run in {nextRun}</span>
              <Button variant="outline" size="sm" disabled={isRunningAll} onClick={handleRunAll}>
                <RefreshCw className={cn("h-3.5 w-3.5", isRunningAll && "animate-spin")} />
                {isRunningAll ? "Running all…" : "Run all now"}
              </Button>
            </div>
          )}
        </header>

        {/* Run-all result */}
        {runAllResult && (
          <div
            role="status"
            className={cn(
              "mt-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm animate-in fade-in slide-in-from-top-1 duration-200",
              runAllResult.failed > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"
            )}
          >
            {runAllResult.failed > 0 ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0 text-primary" />}
            <span className="tabular-nums">
              Ran {runAllResult.ran} monitor{runAllResult.ran !== 1 && "s"}
              {runAllResult.failed > 0 && ` · ${runAllResult.failed} failed`}
              {runAllResult.skipped > 0 && ` · ${runAllResult.skipped} skipped (budget limit)`}
            </span>
          </div>
        )}

        {/* Toolbar: sort + legend */}
        {n > 1 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div role="radiogroup" aria-label="Sort monitors" className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
              {SORTS.map(({ key, label }) => (
                <button
                  key={key}
                  role="radio"
                  aria-checked={sort === key}
                  onClick={() => setSort(key)}
                  className={cn(
                    "rounded-md px-3 py-1 transition-colors",
                    sort === key ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {(["breakout", "trending", "rising"] as const).map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", TIER_STYLE[t].dot)} />
                  {TIER_STYLE[t].label} {t === "breakout" ? "70+" : t === "trending" ? "55–69" : "35–54"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 flex items-center gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Couldn’t load your monitors.
            <button onClick={() => refetch()} className="font-medium underline-offset-4 hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[0, 1].map((i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && n === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <h2 className="text-lg font-semibold">No subcultures on your Signal Board yet</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Open any profile in the Library and choose Start monitoring. Its Breakout Score updates every 6 hours.
            </p>
            <Link
              href="/dashboard/subcultures"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <BookOpen className="h-4 w-4" aria-hidden />Browse the Library
            </Link>
          </div>
        )}

        {/* Cards */}
        {n > 0 && (
          <div className={cn("grid grid-cols-1 gap-6 lg:grid-cols-2", n > 1 ? "mt-6" : "mt-8")}>
            {monitors.map((m) => <MonitorCard key={m.id} monitor={m} />)}
          </div>
        )}
      </main>
    </div>
  );
}
