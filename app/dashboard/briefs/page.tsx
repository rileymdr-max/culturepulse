"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Activity, Layers } from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBriefs, type BriefSummary } from "@/hooks/use-briefs";
import { URGENCY } from "@/lib/brief-urgency";
import { EYEBROW, M } from "@/components/marketing/brand";
import { UrgencyPill, splitLead } from "@/components/brief-view";
import { PlatformLogoRow } from "@/components/platform-logo";

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;
const BOX = "rounded-2xl border-2 border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]";

type Filter = "all" | BriefSummary["urgency"];

/** Left-edge colour so urgency reads at a glance down the grid. */
const EDGE: Record<string, string> = {
  "act-now": "before:bg-primary",
  "this-week": "before:bg-[#FFE14D]",
  monitor: "before:bg-muted",
};

function BriefCard({ brief }: { brief: BriefSummary }) {
  const date = new Date(brief.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const [lead] = brief.momentSummary ? splitLead(brief.momentSummary) : [""];
  const platforms = brief.platformStrategy?.map((p) => p.platform) ?? [];

  return (
    <li className="h-full">
      <Link
        href={`/dashboard/briefs/${brief.id}`}
        className={cn(
          BOX,
          "group relative flex h-full flex-col overflow-hidden p-5 pl-6 transition-[transform,box-shadow] duration-150",
          "hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_hsl(var(--foreground))]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:border-r-2 before:border-foreground before:content-['']",
          EDGE[brief.urgency] ?? EDGE.monitor,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <UrgencyPill urgency={brief.urgency} size="sm" />
            <span className="truncate text-sm font-semibold">{brief.subculture.name}</span>
          </div>
          <span className={cn(M, "shrink-0 text-xs text-muted-foreground tabular-nums")}>{date}</span>
        </div>

        <h2 className="mt-4 text-lg font-semibold leading-snug transition-colors group-hover:text-primary">{brief.headline}</h2>
        {lead && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{lead}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            {brief.velocityAtGeneration !== null && (
              <span className={cn("inline-flex items-center gap-1 tabular-nums", brief.velocityAtGeneration > 0 ? "text-primary" : "text-muted-foreground")}>
                <Activity className="h-3.5 w-3.5" aria-hidden />{signed(brief.velocityAtGeneration)}
              </span>
            )}
            <PlatformLogoRow platforms={platforms} className="h-3.5 w-3.5" />
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-foreground bg-card transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}

function FilterTile({ active, onClick, label, count, emoji }: { active: boolean; onClick: () => void; label: string; count: number; emoji?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border-2 border-foreground px-4 py-3 text-left transition-[transform,box-shadow,background-color] duration-150",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active
          ? "bg-foreground text-background shadow-none"
          : "bg-card shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_hsl(var(--foreground))]",
      )}
    >
      <p className={cn(EYEBROW, active && "text-background/70")}>{emoji && <span aria-hidden>{emoji} </span>}{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p>
    </button>
  );
}

export default function BriefsPage() {
  const { data, isLoading, error, refetch } = useBriefs();
  const [filter, setFilter] = useState<Filter>("all");
  const briefs = data?.briefs ?? [];
  const n = briefs.length;
  const count = (u: BriefSummary["urgency"]) => briefs.filter((b) => b.urgency === u).length;
  const actNow = count("act-now");
  const shown = filter === "all" ? briefs : briefs.filter((b) => b.urgency === filter);
  const subcultures = new Set(briefs.map((b) => b.subculture.id)).size;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <header>
          <p className={cn(EYEBROW, "text-primary")}>Content intelligence</p>
          <h1 className="mt-1 text-5xl tracking-tight">Briefs</h1>
          <div className="mt-2 text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-5 w-64" />
            ) : n === 0 ? (
              "Strategy briefs built from a subculture’s profile and its live signals."
            ) : (
              <>
                <span className="tabular-nums">{n}</span> brief{n !== 1 && "s"} across{" "}
                <span className="tabular-nums">{subcultures}</span> subculture{subcultures !== 1 && "s"}
                {actNow > 0 && (
                  <>, <span className="font-medium text-signal tabular-nums">{actNow} to act on now</span></>
                )}
                .
              </>
            )}
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-8 flex items-center gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Couldn’t load your briefs.
            <button onClick={() => refetch()} className="font-medium underline-offset-4 hover:underline">Try again</button>
          </div>
        )}

        {isLoading && (
          <div aria-hidden>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[74px] rounded-2xl" />)}
            </div>
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
            </div>
          </div>
        )}

        {!isLoading && !error && n === 0 && (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-foreground/40 px-6 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-foreground bg-accent">
              <Layers className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold">No briefs yet</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Choose Generate brief on any Signal Board card or Audience Audit result.
            </p>
            <Link
              href="/dashboard/monitors"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-full border-2 border-foreground bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))] transition-colors hover:bg-primary/90"
            >
              Open the Signal Board
            </Link>
          </div>
        )}

        {n > 0 && (
          <>
            <div role="group" aria-label="Filter by urgency" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FilterTile active={filter === "all"} onClick={() => setFilter("all")} label="All briefs" count={n} />
              <FilterTile active={filter === "act-now"} onClick={() => setFilter("act-now")} label={URGENCY["act-now"].label} count={actNow} emoji="🔥" />
              <FilterTile active={filter === "this-week"} onClick={() => setFilter("this-week")} label={URGENCY["this-week"].label} count={count("this-week")} />
              <FilterTile active={filter === "monitor"} onClick={() => setFilter("monitor")} label={URGENCY.monitor.label} count={count("monitor")} />
            </div>

            {shown.length > 0 ? (
              <ol className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                {shown.map((b) => <BriefCard key={b.id} brief={b} />)}
              </ol>
            ) : (
              <div className="mt-8 rounded-2xl border-2 border-dashed border-foreground/40 px-6 py-12 text-center">
                <p className="font-semibold">No “{URGENCY[filter as BriefSummary["urgency"]].label}” briefs right now</p>
                <button onClick={() => setFilter("all")} className="mt-2 text-sm font-semibold text-primary underline decoration-2 underline-offset-4">
                  Show all briefs
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
