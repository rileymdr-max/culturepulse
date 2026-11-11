"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Users,
  Layers,
  GitCompare,
  ArrowRight,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonitors, type MonitorData } from "@/hooks/use-monitors";
import { useBriefs, type BriefSummary } from "@/hooks/use-briefs";
import { signalTier, TIER_STYLE } from "@/lib/signal-tier";
import { urgencyOf } from "@/lib/brief-urgency";
import { cn, timeAgo } from "@/lib/utils";

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

const MORE_TOOLS = [
  { href: "/dashboard/brand-audit", icon: Users, label: "Audience Audit" },
  { href: "/dashboard/subcultures", icon: Layers, label: "Library" },
  { href: "/dashboard/compare", icon: GitCompare, label: "Compare" },
];

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
  const breakouts = monitors.filter((m) => m.signal.isBreakout).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {/* ── Headline: what changed, not just hello ── */}
        <header className="min-h-[4.5rem]">
          {!mounted || status === "loading" || monitorsQuery.isLoading ? (
            <>
              <Skeleton className="h-9 w-80 max-w-full" />
              <Skeleton className="mt-3 h-5 w-64 max-w-full" />
            </>
          ) : (
            <>
              <h1 className="text-4xl tracking-tight sm:text-5xl">
                {getGreeting(session?.user?.name ?? session?.user?.email)}
              </h1>
              {/* On error the Signal Board panel explains it; don't imply "no monitors" here */}
              {!monitorsQuery.isError && (
                <p className="mt-2 text-muted-foreground">
                  <SignalSummary monitors={monitors} breakouts={breakouts} />
                </p>
              )}
            </>
          )}
        </header>

        {/* ── Main action: search ── */}
        <SearchBox recent={recentSearches} />

        {auditActive && (
          <Link
            href="/dashboard/brand-audit"
            className="group mt-6 flex items-center justify-between gap-4 rounded-2xl border-[1.5px] border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))] px-5 py-4 transition-colors hover:border-primary/40"
          >
            <span className="text-sm">
              <span className="font-medium">Audience Audit in progress.</span>{" "}
              <span className="text-muted-foreground">Pick up where you left off.</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        )}

        {/* ── Live data ── */}
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <SignalPanel query={monitorsQuery} monitors={monitors} />
          <BriefsPanel query={briefsQuery} />
        </div>

        {/* ── Secondary tools ── */}
        <nav aria-label="More tools" className="mt-12 flex flex-wrap gap-2">
          {MORE_TOOLS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

function SignalSummary({ monitors, breakouts }: { monitors: MonitorData[]; breakouts: number }) {
  if (monitors.length === 0) {
    return <>Search a subculture to start, or add one from the Library to your Signal Board.</>;
  }
  const n = monitors.length;
  return (
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
    <section className="mt-8">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex items-center gap-2 rounded-xl border border-input bg-card p-2 shadow-sm transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
      >
        <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <label htmlFor="welcome-search" className="sr-only">
          Describe an audience or niche
        </label>
        <input
          id="welcome-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Describe any audience, e.g. thrift flippers on TikTok"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
        {/* Concentric: outer rounded-xl 12px − p-2 8px = rounded-sm 4px */}
        <Button type="submit" size="lg" disabled={pending || !q.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Discover
        </Button>
      </form>

      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Recent:</span>
          {recent.map((r) => (
            <Link
              key={r}
              href={`/dashboard/search?q=${encodeURIComponent(r)}`}
              className="max-w-[18rem] truncate rounded-md bg-muted px-2.5 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {r}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Panel({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-2xl border-[1.5px] border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]">
      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <h2 className="font-semibold">{title}</h2>
        <Link
          href={href}
          className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
      <div className="flex-1 px-2 pb-2 pt-3">{children}</div>
    </section>
  );
}

function RowSkeletons({ rows }: { rows: number }) {
  return (
    <ul aria-busy className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-3 py-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
          <Skeleton className="h-7 w-10" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-8 text-sm leading-relaxed text-muted-foreground">{children}</div>;
}

function SignalPanel({
  query,
  monitors,
}: {
  query: ReturnType<typeof useMonitors>;
  monitors: MonitorData[];
}) {
  return (
    <Panel title="Signal Board" href="/dashboard/monitors" linkLabel="Open board">
      {query.isLoading ? (
        <RowSkeletons rows={4} />
      ) : query.isError ? (
        <EmptyState>
          Couldn’t load your signals.{" "}
          <button onClick={() => query.refetch()} className="font-medium text-primary hover:underline">
            Try again
          </button>
        </EmptyState>
      ) : monitors.length === 0 ? (
        <EmptyState>
          No monitored subcultures yet.{" "}
          <Link href="/dashboard/subcultures" className="font-medium text-primary hover:underline">
            Add one from the Library
          </Link>{" "}
          to track its Breakout Score here.
        </EmptyState>
      ) : (
        <ul className="animate-in fade-in duration-300">
          {monitors.slice(0, 5).map((m) => {
            const tier = signalTier(m.signal);
            const style = TIER_STYLE[tier];
            const v = m.signal.velocity;
            return (
              <li key={m.id}>
                <Link
                  href={`/dashboard/subcultures/${m.subculture.slug}`}
                  className="flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{m.subculture.name}</span>
                      {(tier === "breakout" || tier === "trending") && (
                        <span className={cn("shrink-0 text-xs font-semibold", style.text)}>{style.label}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="truncate">{m.subculture.category}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
                        {v >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {v > 0 ? "+" : ""}
                        {v}%
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn("text-2xl font-semibold tracking-tight tabular-nums", style.text)}
                    title="Breakout Score"
                  >
                    {m.signal.breakoutScore}
                  </span>
                </Link>
              </li>
            );
          })}
          {monitors.length < 3 && (
            <li className="px-3 pb-2 pt-4 text-sm text-muted-foreground">
              <Link href="/dashboard/subcultures" className="font-medium text-primary hover:underline">
                Add more subcultures
              </Link>{" "}
              to compare their momentum side by side.
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}



function BriefsPanel({ query }: { query: ReturnType<typeof useBriefs> }) {
  const briefs = query.data?.briefs.slice(0, 4) ?? [];
  return (
    <Panel title="Latest briefs" href="/dashboard/briefs" linkLabel="All briefs">
      {query.isLoading ? (
        <RowSkeletons rows={3} />
      ) : query.isError || briefs.length === 0 ? (
        <EmptyState>
          Briefs you generate from a signal show up here, with angles and hooks ready for your
          creative team.
        </EmptyState>
      ) : (
        <ul className="animate-in fade-in duration-300">
          {briefs.map((b) => {
            const u = urgencyOf(b.urgency);
            return (
              <li key={b.id}>
                <Link
                  href={`/dashboard/briefs/${b.id}`}
                  className="block rounded-lg px-3 py-3 transition-colors hover:bg-muted"
                >
                  <p className="line-clamp-2 font-medium leading-snug">{b.headline}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className={cn("font-medium", u.text)}>{u.label}</span> · {b.subculture.name} ·{" "}
                    {timeAgo(b.createdAt)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
