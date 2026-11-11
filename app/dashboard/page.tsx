"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, FileText, Loader2, Lock, Search } from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonitors, type MonitorData } from "@/hooks/use-monitors";
import { useBriefs, useCreateBrief } from "@/hooks/use-briefs";
import { useCurrentPlan } from "@/hooks/use-billing";
import { getPlan } from "@/lib/plans";
import { signalTier, type SignalTier } from "@/lib/signal-tier";
import { urgencyOf } from "@/lib/brief-urgency";
import { MONITOR_PLATFORMS } from "@/lib/acceleration";
import { BTN_GO_SM, BTN_LINE_SM, D, EYEBROW, F2, M, PANEL } from "@/components/marketing/brand";
import { cn, timeAgo } from "@/lib/utils";

/* ── Signed-in home ("Pulse hero")
   The biggest mover on the user's Signal Board leads as a big score card,
   with search and briefs beside it and the other monitors as score cards. */

// Must match the key the search page writes (app/dashboard/search/page.tsx).
const RECENT_SEARCHES_KEY = "speedbag:recent-discoveries";
const AUDIT_SESSION_KEY = "culturepulse-audience-audit";

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function hasActiveAudit(): boolean {
  try {
    const raw = sessionStorage.getItem(AUDIT_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed?.audit || parsed?.audience);
  } catch {
    return false;
  }
}

function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const first = name?.split(/[ @]/)[0];
  return first ? `Good ${time}, ${first}` : `Good ${time}`;
}

const PLATFORM_LABEL: Record<string, string> = {
  reddit: "Reddit",
  twitter: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  trends: "Google Trends",
};
const label = (p: string) => PLATFORM_LABEL[p] ?? p;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;

/** Tier pill colors (brand palette; text stays ink for contrast). */
const TIER_PILL: Record<SignalTier, { label: string; cls: string }> = {
  breakout: { label: "Breakout", cls: "bg-[#0B6B45] text-white" },
  trending: { label: "Trending", cls: "bg-[#FFE14D] text-[#111110]" },
  rising: { label: "Rising", cls: "bg-[#BBA8FF] text-[#111110]" },
  stable: { label: "Steady", cls: "bg-[#FFFDF8] text-[#111110]" },
  cooling: { label: "Cooling", cls: "bg-[#FFFDF8] text-[#5E5A52]" },
};

/** Platforms with a velocity reading, strongest first. */
function movingPlatforms(m: MonitorData) {
  return MONITOR_PLATFORMS.map((p) => ({ p, v: m.signal.platform[p]?.velocity ?? null }))
    .filter((x): x is { p: (typeof MONITOR_PLATFORMS)[number]; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v);
}

/**
 * One point per run: the average of each platform's reading relative to its
 * first run (1 = unchanged). Oldest first. Drives the sparklines.
 */
function trendSeries(m: MonitorData): number[] {
  const runs = new Map<string, Map<string, number>>();
  for (const s of m.snapshots) {
    const key = s.capturedAt.slice(0, 16); // a run's rows share the same minute
    if (!runs.has(key)) runs.set(key, new Map());
    runs.get(key)!.set(s.platform, s.engagement ?? s.postCount);
  }
  const ordered = Array.from(runs.entries()).sort(([a], [b]) => a.localeCompare(b));
  const base = new Map<string, number>();
  return ordered.map(([, vals]) => {
    const ratios: number[] = [];
    vals.forEach((v, p) => {
      if (!base.has(p) && v > 0) base.set(p, v);
      const b = base.get(p);
      if (b) ratios.push(v / b);
    });
    return ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
  });
}

function Sparkline({
  series,
  height,
  stroke = F2.ink,
  fill,
  className,
}: {
  series: number[];
  height: number;
  stroke?: string;
  fill?: string;
  className?: string;
}) {
  if (series.length < 2) {
    return (
      <div className={cn("flex items-center text-xs text-[#5E5A52]", className)} style={{ height }}>
        Trend line appears after the next run.
      </div>
    );
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pad = 4;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * 300;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = `M${pts.join(" L")}`;
  return (
    <svg
      viewBox={`0 0 300 ${height}`}
      preserveAspectRatio="none"
      className={cn("block w-full", className)}
      style={{ height }}
      aria-hidden
    >
      {fill && <path d={`${line} L300 ${height} L0 ${height}Z`} fill={fill} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const monitorsQuery = useMonitors();
  const briefsQuery = useBriefs();

  // Browser-only state is read after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [auditActive, setAuditActive] = useState(false);
  useEffect(() => {
    setRecentSearches(getRecentSearches().slice(0, 4));
    setAuditActive(hasActiveAudit());
    setMounted(true);
  }, []);

  const monitors = [...(monitorsQuery.data?.monitors ?? [])].sort(
    (a, b) => b.signal.breakoutScore - a.signal.breakoutScore
  );
  const [lead, ...rest] = monitors;
  const counts = { breakout: 0, trending: 0, rising: 0 };
  for (const m of monitors) {
    const t = signalTier(m.signal);
    if (t === "breakout" || t === "trending" || t === "rising") counts[t]++;
  }
  const lastRun = monitors
    .map((m) => m.lastRunAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  const loading = !mounted || status === "loading" || monitorsQuery.isLoading;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8 sm:px-8 sm:py-10">
        {/* ── Greeting + tier counts ── */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-4 w-56" />
                <Skeleton className="mt-3 h-12 w-96 max-w-full" />
              </>
            ) : (
              <>
                <p className={EYEBROW}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  {lastRun && <> · last run {timeAgo(lastRun)}</>}
                </p>
                <h1 className="mt-2 text-5xl leading-[0.92] sm:text-6xl">
                  {getGreeting(session?.user?.name ?? session?.user?.email)}
                </h1>
              </>
            )}
          </div>
          {!loading && monitors.length > 0 && (
            <Link href="/dashboard/monitors" className="flex flex-wrap gap-2.5" aria-label="Open the Signal Board">
              {(["breakout", "trending", "rising"] as const).map((t) => (
                <span
                  key={t}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border-2 border-[#111110] px-3.5 py-1.5 text-sm font-bold shadow-[3px_3px_0_#111110]",
                    TIER_PILL[t].cls
                  )}
                >
                  {TIER_PILL[t].label}
                  <span className={cn(D, "text-lg leading-none tabular-nums")}>{counts[t]}</span>
                </span>
              ))}
            </Link>
          )}
        </header>

        {/* ── Lead card + side column ── */}
        <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-[1.55fr_1fr]">
          {monitorsQuery.isLoading || !mounted ? (
            <Skeleton className="h-[420px] rounded-[20px]" />
          ) : monitorsQuery.isError ? (
            <section className={cn(PANEL, "p-8")}>
              <p className="font-bold">Couldn’t load your signals.</p>
              <button onClick={() => monitorsQuery.refetch()} className="mt-2 font-bold text-primary underline">
                Try again
              </button>
            </section>
          ) : lead ? (
            <LeadCard monitor={lead} total={monitors.length} />
          ) : (
            <StartCard />
          )}

          <aside className="flex flex-col gap-6">
            <SearchBox recent={recentSearches} />
            {auditActive && (
              <Link
                href="/dashboard/brand-audit"
                className={cn(PANEL, "group flex items-center justify-between gap-4 px-5 py-4 shadow-[3px_3px_0_#111110]")}
              >
                <span className="text-sm">
                  <span className="font-bold">Audience Audit in progress.</span>{" "}
                  <span className="text-[#5E5A52]">Pick up where you left off.</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
            <BriefsPanel query={briefsQuery} />
          </aside>
        </div>

        {/* ── The rest of the board ── */}
        {rest.length > 0 && (
          <section className="mt-8" aria-label="Other monitored subcultures">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {rest.slice(0, 4).map((m) => (
                <MonitorCard key={m.id} monitor={m} />
              ))}
            </div>
            {rest.length > 4 && (
              <Link href="/dashboard/monitors" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
                {rest.length - 4} more on the Signal Board <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

function LeadCard({ monitor: m, total }: { monitor: MonitorData; total: number }) {
  const tier = signalTier(m.signal);
  const moving = movingPlatforms(m);
  const top = moving[0];
  const { limits } = getPlan(useCurrentPlan());
  const up = moving.filter((x) => x.v > 0).slice(0, 2);
  const { mutate: createBrief, isPending, data: briefResult } = useCreateBrief();

  const summary =
    up.length > 0
      ? `${up.map((x) => `${label(x.p)} ${signed(x.v)}`).join(" and ")} compared with earlier runs.`
      : m.subculture.description;

  return (
    <section className="overflow-hidden rounded-[20px] border-2 border-[#111110] bg-[#FFFDF8] shadow-[8px_8px_0_#111110]">
      <div className={cn(M, "flex items-center justify-between gap-4 border-b-2 border-[#111110] bg-[#C7F2D9] px-5 py-2.5 text-xs")}>
        <span className="font-medium text-[#0B6B45]">● {tier === "breakout" ? "Breakout on your board" : "Top of your board"}</span>
        <span className="hidden text-[#5E5A52] sm:inline">
          {total} monitor{total !== 1 && "s"} · {m.platforms.length} platforms
        </span>
      </div>

      <div className="flex items-start justify-between gap-5 px-6 pb-2 pt-5">
        <div className="min-w-0">
          <p className={cn(EYEBROW, "text-[#0B6B45]")}>
            {m.subculture.category}
            {moving.length > 0 && <> · {moving.slice(0, 3).map((x) => label(x.p)).join(", ")}</>}
          </p>
          <h2 className={cn(D, "mt-1.5 text-4xl leading-[0.95] sm:text-[46px]")}>
            <Link href={`/dashboard/subcultures/${m.subculture.slug}`} className="hover:text-[#0B6B45]">
              {m.subculture.name}
            </Link>
          </h2>
          <p className="mt-2 line-clamp-2 max-w-xl text-sm text-[#5E5A52]">{summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className={cn(D, "block text-[68px] leading-[0.85] text-[#0B6B45] sm:text-[112px]")}>
            {m.signal.breakoutScore}
          </span>
          <span className={cn(EYEBROW, "mt-1 block")}>Breakout score</span>
        </div>
      </div>

      <Sparkline series={trendSeries(m)} height={88} stroke={F2.green} fill={F2.mint} className="px-6" />

      <div className="relative border-t-2 border-[#111110]">
      <dl
        className={cn("grid grid-cols-2 sm:grid-cols-4", !limits.accelerationScores && "pointer-events-none select-none blur-[6px]")}
        aria-hidden={!limits.accelerationScores}
      >
        {[
          { k: "Velocity", v: signed(m.signal.velocity) },
          { k: "Momentum", v: m.signal.momentum },
          { k: "Cross-platform", v: `${moving.length} of ${MONITOR_PLATFORMS.length}` },
          { k: "Top platform", v: top ? label(top.p) : "—" },
        ].map(({ k, v }, i) => (
          <div
            key={k}
            className={cn(
              "border-[#111110] px-5 py-3",
              i % 2 === 1 && "border-l-2",
              i >= 2 && "border-t-2 sm:border-t-0",
              i === 2 && "sm:border-l-2"
            )}
          >
            <dt className="text-xs text-[#5E5A52]">{k}</dt>
            <dd className={cn(D, "truncate text-2xl")}>{v}</dd>
          </div>
        ))}
      </dl>
      {!limits.accelerationScores && (
        <Link
          href="/dashboard/billing"
          className="absolute inset-0 flex items-center justify-center gap-1.5 text-sm font-bold underline-offset-4 hover:underline"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Acceleration scoring is on Starter and above
        </Link>
      )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t-2 border-[#111110] px-5 py-4">
        {briefResult?.brief ? (
          <Link href={`/dashboard/briefs/${briefResult.brief.id}`} className={BTN_GO_SM}>
            <Check className="h-3.5 w-3.5" aria-hidden />
            View brief
          </Link>
        ) : limits.briefs === 0 ? (
          <Link href="/dashboard/billing" className={BTN_GO_SM}>
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Briefs on Starter
          </Link>
        ) : (
          <button
            type="button"
            className={BTN_GO_SM}
            disabled={isPending}
            onClick={() => createBrief({ subcultureId: m.subculture.id, monitorId: m.id })}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {isPending ? "Writing brief…" : "Write a brief"}
          </button>
        )}
        <Link href="/dashboard/monitors" className={BTN_LINE_SM}>
          Open Signal Board
        </Link>
        {m.lastRunAt && <span className="ml-auto text-xs text-[#5E5A52]">Updated {timeAgo(m.lastRunAt)}</span>}
      </div>
    </section>
  );
}

function MonitorCard({ monitor: m }: { monitor: MonitorData }) {
  const tier = signalTier(m.signal);
  const moving = movingPlatforms(m);
  return (
    <Link
      href={`/dashboard/subcultures/${m.subculture.slug}`}
      className="group block rounded-2xl border-[1.5px] border-[#111110] bg-[#FFFDF8] p-4 shadow-[3px_3px_0_#111110] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-bold leading-snug group-hover:text-[#0B6B45]">{m.subculture.name}</h3>
          <span
            className={cn(
              "mt-1.5 inline-block rounded-full border-[1.5px] border-[#111110] px-2 py-0.5 text-[11px] font-bold",
              TIER_PILL[tier].cls
            )}
          >
            {TIER_PILL[tier].label}
          </span>
        </div>
        <span className={cn(D, "text-[38px] leading-[0.9] tabular-nums")}>{m.signal.breakoutScore}</span>
      </div>
      <Sparkline series={trendSeries(m)} height={34} className="mt-2" />
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#5E5A52]">
        {MONITOR_PLATFORMS.map((p) => (
          <span
            key={p}
            title={label(p)}
            className={cn(
              "h-2 w-2 rounded-full",
              m.signal.platform[p]?.velocity != null ? "bg-[#0B6B45]" : "border-[1.5px] border-[#B9B2A4]"
            )}
          />
        ))}
        <span className="ml-1">
          {moving.length} of {MONITOR_PLATFORMS.length} · {signed(m.signal.velocity)}
        </span>
      </div>
    </Link>
  );
}

function StartCard() {
  return (
    <section className="flex flex-col justify-center rounded-[20px] border-2 border-[#111110] bg-[#C7F2D9] p-8 shadow-[8px_8px_0_#111110] sm:p-10">
      <p className={cn(EYEBROW, "text-[#0B6B45]")}>Your Signal Board is empty</p>
      <h2 className={cn(D, "mt-2 text-4xl leading-[0.95] sm:text-5xl")}>Pick a subculture to watch</h2>
      <p className="mt-3 max-w-md text-[#3B3832]">
        Add one from the Library and CulturePulse scores it across Reddit, TikTok, X, YouTube, Instagram and
        Google Trends, so you see a breakout coming.
      </p>
      <Link href="/dashboard/subcultures" className={cn(BTN_GO_SM, "mt-6 h-11 self-start px-6 text-base")}>
        Browse the Library <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function SearchBox({ recent }: { recent: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);

  function go(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setPending(true);
    router.push(`/dashboard/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section className={cn(PANEL, "p-4 shadow-[4px_4px_0_#111110]")}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex items-center gap-2"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border-[1.5px] border-[#111110] bg-white px-3 focus-within:ring-4 focus-within:ring-primary/25">
          <Search className="h-4 w-4 shrink-0 text-[#5E5A52]" aria-hidden />
          <label htmlFor="welcome-search" className="sr-only">
            Describe an audience or niche
          </label>
          <input
            id="welcome-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Describe any audience, e.g. thrift flippers on TikTok"
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8F8A80]"
            autoComplete="off"
          />
        </div>
        <Button type="submit" size="lg" disabled={pending || !q.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Discover
        </Button>
      </form>

      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#5E5A52]">Recent:</span>
          {recent.map((r) => (
            <Link
              key={r}
              href={`/dashboard/search?q=${encodeURIComponent(r)}`}
              className="max-w-[14rem] truncate rounded-full bg-[#F2EDE3] px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {r}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function BriefsPanel({ query }: { query: ReturnType<typeof useBriefs> }) {
  const briefs = query.data?.briefs.slice(0, 3) ?? [];
  return (
    <section className={cn(PANEL, "flex flex-1 flex-col shadow-[4px_4px_0_#111110]")}>
      <div className="flex items-baseline justify-between gap-4 px-5 pb-2 pt-4">
        <h2 className={cn(D, "text-2xl")}>Latest briefs</h2>
        <Link href="/dashboard/briefs" className="inline-flex items-center gap-1 text-sm font-bold text-primary">
          All briefs <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      {query.isLoading ? (
        <div className="space-y-3 px-5 pb-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : query.isError || briefs.length === 0 ? (
        <p className="px-5 pb-5 text-sm leading-relaxed text-[#5E5A52]">
          Briefs you write from a signal show up here, with angles and hooks ready for your creative team.
        </p>
      ) : (
        <ul>
          {briefs.map((b) => {
            const u = urgencyOf(b.urgency);
            return (
              <li key={b.id} className="border-t border-[#E4DDD0]">
                <Link href={`/dashboard/briefs/${b.id}`} className="block px-5 py-3 transition-colors hover:bg-[#F2EDE3]">
                  <p className="line-clamp-2 text-[15px] font-bold leading-snug">{b.headline}</p>
                  <p className="mt-1 text-xs text-[#5E5A52]">
                    <span className={cn("font-bold", u.text)}>{u.label}</span> · {b.subculture.name} ·{" "}
                    {timeAgo(b.createdAt)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
