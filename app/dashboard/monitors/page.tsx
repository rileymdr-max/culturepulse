"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Minus, Trash2, Pause, Play,
  AlertCircle, BookOpen, ArrowUpRight, FileText, Loader2, RefreshCw, Check,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { NavHeader } from "@/components/nav-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { signalTier, type SignalTier } from "@/lib/signal-tier";
import { MONITOR_AUTO_RUN, MONITOR_REFRESH_COPY } from "@/lib/monitor-schedule";
import {
  BRAND_ROOT, D, M, F2, PANEL, EYEBROW, BTN_GO_SM, BTN_LINE_SM, BTN_GHOST_SM,
} from "@/components/marketing/brand";
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

/* F2 tier palette (page-scoped). Text colors are ≥6:1 on the card;
   chips put ink text on a light fill, or white on green. */
const TIER: Record<SignalTier, { label: string; text: string; chip: string; swatch: string }> = {
  breakout: { label: "Breakout", text: "text-[#0B6B45]", chip: "bg-[#0B6B45] text-white", swatch: "bg-[#0B6B45]" },
  trending: { label: "Trending", text: "text-[#742A9E]", chip: "bg-[#BBA8FF] text-[#111110]", swatch: "bg-[#BBA8FF]" },
  rising: { label: "Rising", text: "text-[#111110]", chip: "bg-[#C7F2D9] text-[#111110]", swatch: "bg-[#C7F2D9]" },
  stable: { label: "Stable", text: "text-[#5E5A52]", chip: "bg-[#F2EDE3] text-[#5E5A52]", swatch: "bg-[#F2EDE3]" },
  cooling: { label: "Cooling", text: "text-[#5E5A52]", chip: "bg-[#F2EDE3] text-[#5E5A52]", swatch: "bg-[#F2EDE3]" },
};

function TierChip({ tier, className }: { tier: SignalTier; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 border-[#111110] px-2.5 py-0.5 text-xs font-bold",
        TIER[tier].chip,
        className
      )}
    >
      {TIER[tier].label}
    </span>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

const CHART_PLATFORMS = VELOCITY_PLATFORMS;
type ChartPlatform = (typeof CHART_PLATFORMS)[number];
type ChartPoint = { name: string } & Partial<Record<ChartPlatform | `${ChartPlatform}Raw`, number>>;

const ENGAGEMENT_UNIT: Record<ChartPlatform, string> = {
  reddit: "upvotes + comments",
  twitter: "likes + reposts",
  tiktok: "views",
  youtube: "views",
  instagram: "likes",
  trends: "search interest",
};

/**
 * One point per run (last 8). Each platform is plotted as % change in
 * engagement from its first run in the window, so platforms measured in
 * views, likes and search interest share one axis. Raw values go in `<p>Raw`.
 */
function buildChartData(snapshots: MonitorData["snapshots"]): ChartPoint[] {
  const byRun = new Map<string, ChartPoint>();
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );
  for (const s of sorted) {
    if (!(CHART_PLATFORMS as readonly string[]).includes(s.platform)) continue;
    // Key by minute so two runs in the same hour stay separate points.
    const name = new Date(s.capturedAt).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    const point = byRun.get(name) ?? { name };
    point[`${s.platform as ChartPlatform}Raw`] = s.engagement;
    byRun.set(name, point);
  }
  const points = Array.from(byRun.values()).slice(-8);
  for (const p of CHART_PLATFORMS) {
    const base = points.map((pt) => pt[`${p}Raw`]).find((v): v is number => !!v && v > 0);
    if (base === undefined) continue;
    for (const pt of points) {
      const raw = pt[`${p}Raw`];
      if (raw !== undefined) pt[p] = Math.round((raw / base - 1) * 100);
    }
  }
  return points;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border-2 border-[#111110] bg-[#FFFDF8] px-3 py-2 text-xs shadow-[3px_3px_0_#111110]">
      <p className="mb-1 text-[#5E5A52]">{label}</p>
      {payload.map((p: { dataKey: ChartPlatform; value: number; color: string; payload: ChartPoint }) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 tabular-nums">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {platformLabel(p.dataKey)}: <strong className="font-bold">{signed(p.value)}</strong>
          <span className="text-[#5E5A52]">
            ({(p.payload[`${p.dataKey}Raw`] ?? 0).toLocaleString()} {ENGAGEMENT_UNIT[p.dataKey]})
          </span>
        </p>
      ))}
    </div>
  );
}

// One distinct hue per platform, all ≥5:1 on the card background (#FFFDF8).
// Trends is dashed because it measures search interest, not posts.
const SERIES_COLOR: Record<ChartPlatform, string> = {
  reddit: F2.green,    // #0B6B45  6.4:1
  twitter: F2.ink,     // #111110 18.6:1
  tiktok: "#A3245C",   // rose     7.0:1
  youtube: "#8A6A00",  // ochre (F2 yellow, deepened) 5.0:1
  instagram: F2.violet, // #742A9E 8.0:1
  trends: F2.muted,    // #5E5A52  6.8:1
};
const DASHED: ReadonlySet<ChartPlatform> = new Set(["trends"]);
const AXIS_TICK = { fontSize: 11, fill: F2.muted };

function VolumeChart({ snapshots }: { snapshots: MonitorData["snapshots"] }) {
  const data = buildChartData(snapshots);

  if (data.length < 2) {
    return (
      <div className="flex min-h-16 items-center rounded-xl bg-[#F2EDE3] px-4 py-3 text-sm text-[#5E5A52]">
        Engagement chart appears after the second run. {MONITOR_REFRESH_COPY.charAt(0).toUpperCase() + MONITOR_REFRESH_COPY.slice(1)}.
      </div>
    );
  }

  // Distinct colour per platform; Trends dashed.
  const series = CHART_PLATFORMS.map((key) => ({
    key,
    color: SERIES_COLOR[key],
    dash: DASHED.has(key) ? "4 3" : undefined,
  })).filter((s) => data.some((d) => d[s.key] !== undefined));

  return (
    <div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={F2.rule} vertical={false} />
          <XAxis
            dataKey="name"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: F2.rule }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => signed(v)}
          />
          <ReferenceLine y={0} stroke={F2.muted} strokeWidth={1} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: F2.ink, strokeDasharray: "3 3" }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeDasharray={s.dash}
              strokeWidth={2}
              dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5E5A52]">
        <span>Engagement change since first run shown</span>
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <svg width="16" height="8" aria-hidden className="shrink-0">
              <line x1="0" y1="4" x2="16" y2="4" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash ? "4 2" : undefined} />
            </svg>
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
    <div className="min-w-0 px-3 py-3 first:pl-4 last:pr-4">
      <div className={EYEBROW}>{label}</div>
      <div className="mt-1 text-[15px] font-semibold tabular-nums">{children}</div>
    </div>
  );
}

function MomentumValue({ momentum }: { momentum: AccelerationSignal["momentum"] }) {
  const Icon = momentum === "rising" ? TrendingUp : momentum === "falling" ? TrendingDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 capitalize", momentum === "falling" && "text-[#5E5A52]")}>
      <Icon className="h-4 w-4" aria-hidden />
      {momentum}
    </span>
  );
}

function StrengthBar({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-full max-w-16 overflow-hidden rounded-full border border-[#111110] bg-[#F2EDE3]">
        <span className="block h-full bg-[#0B6B45]" style={{ width: `${Math.min(100, value)}%` }} />
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
        PANEL,
        "flex flex-col gap-5 p-5 sm:p-6",
        tier === "breakout" && "shadow-[5px_5px_0_#0B6B45]",
        !isActive && "opacity-70"
      )}
    >
      {/* Header: name + score */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <Link
              href={`/dashboard/subcultures/${monitor.subculture.slug}`}
              className="truncate text-lg font-bold tracking-tight underline-offset-4 transition-colors hover:text-[#0B6B45] hover:underline"
            >
              {monitor.subculture.name}
            </Link>
            {showTierLabel && <TierChip tier={tier} />}
            {!isActive && (
              <span className="inline-flex items-center rounded-full border-2 border-dashed border-[#5E5A52] px-2.5 py-0.5 text-xs font-bold text-[#5E5A52]">
                Paused
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-[#5E5A52]">
            {monitor.subculture.category} · {monitor.platforms.map(platformLabel).join(", ")} · {lastRun}
          </p>
        </div>
        <div className="shrink-0 text-right" title="Breakout Score (0–100)">
          <div className={cn(D, "text-5xl leading-[0.9] tabular-nums", TIER[tier].text)}>
            {signal.breakoutScore}
          </div>
          <div className={cn(EYEBROW, "mt-1.5")}>Breakout Score</div>
        </div>
      </header>

      {/* Acceleration breakdown */}
      <div>
        <div className="grid grid-cols-3 divide-x-2 divide-[#E4DDD0] rounded-xl border-2 border-[#E4DDD0]">
          <Metric label="Velocity">
            <span className={cn(signal.velocity > 0 && TIER[tier].text)}>{signed(signal.velocity)}</span>
          </Metric>
          <Metric label="Momentum">
            <MomentumValue momentum={signal.momentum} />
          </Metric>
          <Metric label="Cross-platform">
            <StrengthBar value={signal.crossPlatformStrength} />
          </Metric>
        </div>
        {perPlatform.length > 0 && (
          <p className={cn(M, "mt-2 text-xs text-[#5E5A52] tabular-nums")}>
            {perPlatform.map(({ p, v }) => `${platformLabel(p)} ${signed(v)}`).join(" · ")}
          </p>
        )}
      </div>

      <VolumeChart snapshots={monitor.snapshots} />

      {/* Top posts */}
      {topPosts.length > 0 && (
        <div>
          <h3 className={EYEBROW}>Latest top posts</h3>
          <ul className="mt-2 divide-y divide-[#E4DDD0]">
            {topPosts.slice(0, 5).map((post, i) => (
              <li key={i}>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 py-2 text-sm text-[#111110] transition-colors hover:text-[#0B6B45]"
                >
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#5E5A52] transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-[#0B6B45]" aria-hidden />
                  <span className="shrink-0 text-xs text-[#5E5A52]">{platformLabel(post.platform)}</span>
                  <span className="line-clamp-1 flex-1">{post.title}</span>
                  {post.score > 0 && (
                    <span className={cn(M, "shrink-0 text-xs tabular-nums text-[#5E5A52]")}>{post.score.toLocaleString()}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <footer className="mt-auto flex flex-wrap items-center gap-1 border-t-2 border-[#111110] pt-4">
        {briefResult?.brief ? (
          <Link href={`/dashboard/briefs/${briefResult.brief.id}`} className={BTN_GO_SM}>
            <Check className="h-3.5 w-3.5" aria-hidden />View brief
          </Link>
        ) : (
          <button
            type="button"
            className={BTN_GO_SM}
            disabled={isGeneratingBrief}
            onClick={() => createBrief({ subcultureId: monitor.subculture.id, monitorId: monitor.id })}
          >
            {isGeneratingBrief ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {isGeneratingBrief ? "Generating brief…" : "Generate brief"}
          </button>
        )}

        <button
          type="button"
          className={BTN_GHOST_SM}
          disabled={isRunning || !isActive}
          onClick={() => runNow(monitor.id)}
          title={!isActive ? "Resume this monitor to run it" : undefined}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
          {isRunning ? "Running…" : "Run now"}
        </button>

        <Link href={`/dashboard/subcultures/${monitor.subculture.slug}`} className={BTN_GHOST_SM}>
          <BookOpen className="h-3.5 w-3.5" aria-hidden />Profile
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className={BTN_GHOST_SM}
            disabled={isToggling}
            onClick={() => setStatus({ id: monitor.id, status: isActive ? "paused" : "active" })}
          >
            {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isActive ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            className={cn(BTN_GHOST_SM, confirmDelete ? "text-[#B42318] hover:bg-[#FDECEA]" : "text-[#5E5A52]")}
            disabled={isDeleting}
            onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteMonitor(monitor.id); }}
            onBlur={() => setConfirmDelete(false)}
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {confirmDelete ? "Click again to remove" : "Remove"}
          </button>
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
    <div aria-hidden className={cn(PANEL, "space-y-5 p-5 sm:p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-12 w-14" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-[72px] w-full rounded-xl" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

export default function SignalBoardPage() {
  const { data, isLoading, error, refetch } = useMonitors();
  const [sort, setSort] = useState<SortKey>("score");
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllResult, setRunAllResult] = useState<
    { ran: number; failed: number; skipped: number; alreadyRunning?: boolean } | null
  >(null);
  const queryClient = useQueryClient();
  const nextRun = useNextCronRun();

  const handleRunAll = useCallback(async () => {
    setIsRunningAll(true);
    setRunAllResult(null);
    try {
      const res = await fetch("/api/monitors/run-mine", { method: "POST" });
      if (res.status === 409) {
        setRunAllResult({ ran: 0, failed: 0, skipped: 0, alreadyRunning: true });
        return;
      }
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
    // Paper background behind the shared nav; F2 fonts are scoped to <main>
    // so the nav keeps its own design-system look until the app-wide pass.
    <div className="flex min-h-screen flex-col bg-[#F2EDE3]">
      <NavHeader />

      <main className={cn(BRAND_ROOT, "mx-auto w-full max-w-screen-xl flex-1 px-4 pb-16 pt-10 sm:px-6")}>
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className={cn(D, "text-5xl leading-[0.95] sm:text-6xl")}>Signal Board</h1>
            <div className="mt-3 text-base text-[#5E5A52]">
              {isLoading ? (
                <Skeleton className="inline-block h-5 w-72 max-w-full align-middle" />
              ) : n === 0 ? (
                "Track a subculture to see its Breakout Score here."
              ) : (
                <>
                  {breakouts > 0 ? (
                    <span className="font-bold text-[#0B6B45]">
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
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn(M, "text-xs text-[#5E5A52] tabular-nums")}>
                {MONITOR_AUTO_RUN ? `Next auto-run in ${nextRun}` : "Auto-runs paused · run manually"}
              </span>
              <button type="button" className={BTN_LINE_SM} disabled={isRunningAll} onClick={handleRunAll}>
                <RefreshCw className={cn("h-3.5 w-3.5", isRunningAll && "animate-spin")} />
                {isRunningAll ? "Running all…" : "Run all now"}
              </button>
            </div>
          )}
        </header>

        {/* Run-all result */}
        {runAllResult && (
          <div
            role="status"
            className={cn(
              "mt-6 flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-1 duration-200",
              runAllResult.failed > 0
                ? "border-[#B42318] bg-[#FDECEA] text-[#8A1C12]"
                : "border-[#111110] bg-[#C7F2D9] text-[#111110]"
            )}
          >
            {runAllResult.failed > 0 ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
            <span className="tabular-nums">
              {runAllResult.alreadyRunning ? (
                "A run is already in progress. Refresh in a minute or two to see the results."
              ) : (
                <>
                  Ran {runAllResult.ran} monitor{runAllResult.ran !== 1 && "s"}
                  {runAllResult.failed > 0 && ` · ${runAllResult.failed} failed`}
                  {runAllResult.skipped > 0 && ` · ${runAllResult.skipped} skipped (budget limit)`}
                </>
              )}
            </span>
          </div>
        )}

        {/* Toolbar: sort + legend */}
        {n > 1 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div
              role="radiogroup"
              aria-label="Sort monitors"
              className="flex max-w-full gap-1 overflow-x-auto rounded-full border-2 border-[#111110] bg-[#FFFDF8] p-1 text-sm"
            >
              {SORTS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={sort === key}
                  onClick={() => setSort(key)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3.5 py-1.5 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B45]",
                    sort === key ? "bg-[#111110] text-[#F2EDE3]" : "text-[#5E5A52] hover:text-[#111110]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#5E5A52]">
              {(["breakout", "trending", "rising"] as const).map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className={cn("h-3 w-3 rounded-full border-2 border-[#111110]", TIER[t].swatch)} />
                  <span className="font-semibold text-[#111110]">{TIER[t].label}</span>
                  <span className={cn(M, "tabular-nums")}>{t === "breakout" ? "70+" : t === "trending" ? "55–69" : "35–54"}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border-2 border-[#B42318] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#8A1C12]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Couldn’t load your monitors.
            <button
              type="button"
              onClick={() => refetch()}
              className="font-bold underline decoration-2 underline-offset-2 hover:text-[#111110]"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-2">
            {[0, 1].map((i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && n === 0 && (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-[#111110] bg-[#FFFDF8] px-6 py-16 text-center">
            <h2 className="text-xl font-bold">No subcultures on your Signal Board yet</h2>
            <p className="mx-auto mt-2 max-w-md text-[#5E5A52]">
              Open any profile in the Library and choose Start monitoring. Its Breakout Score updates after each run; {MONITOR_REFRESH_COPY}.
            </p>
            <Link href="/dashboard/subcultures" className={cn(BTN_GO_SM, "mt-6 h-11 px-5 text-[15px]")}>
              <BookOpen className="h-4 w-4" aria-hidden />Browse the Library
            </Link>
          </div>
        )}

        {/* Cards */}
        {n > 0 && (
          <div className={cn("grid grid-cols-1 gap-7 lg:grid-cols-2", n > 1 ? "mt-6" : "mt-8")}>
            {monitors.map((m) => <MonitorCard key={m.id} monitor={m} />)}
          </div>
        )}
      </main>
    </div>
  );
}
