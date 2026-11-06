"use client";

import { useState } from "react";
import { Search, Sparkles, Users, Layers, AlertCircle, ChevronRight, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrandAudit } from "@/hooks/use-brand-audit";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BrandAuditResult, MatchedSubculture, DiscoveredSubculture } from "@/lib/types/brand-audit";

const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "twitter", label: "X / Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "reddit", label: "Reddit" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
] as const;

export default function BrandAuditPage() {
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const { mutate, data, isPending, error, isSuccess } = useBrandAudit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = handle.trim().replace(/^@/, "");
    if (!trimmed) return;
    mutate({ handle: trimmed, platform });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brand Audit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter any brand&apos;s social handle to discover which subcultures define their audience — and uncover ones nobody has mapped yet.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Social handle</label>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="nike, patagonia, glossier…"
                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button type="submit" disabled={isPending || !handle.trim()} className="gap-2 shrink-0">
                <Search className="h-4 w-4" />
                {isPending ? "Analyzing…" : "Run audit"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Works best with Twitter/X handles. Instagram and TikTok also supported.
            </p>
          </div>

          {/* Platform selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    platform === p.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error.message}
          </div>
        )}

        {/* Loading state */}
        {isPending && <AuditSkeleton />}

        {/* Results */}
        {isSuccess && data && !isPending && <AuditResults data={data} />}

        {/* Empty state */}
        {!isPending && !isSuccess && !error && (
          <div className="flex flex-col items-center justify-center py-28 text-center text-muted-foreground space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center">
              <Layers className="h-7 w-7 text-muted-foreground opacity-50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Map any brand&apos;s subculture DNA</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Enter a brand&apos;s handle above. CulturePulse will analyze their social audience and return the subcultures they belong to — plus ones we&apos;ve never seen before.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

function AuditResults({ data }: { data: BrandAuditResult }) {
  const strong = data.matched_subcultures.filter((s) => s.match_strength === "strong");
  const others = data.matched_subcultures.filter((s) => s.match_strength !== "strong");

  return (
    <div className="space-y-8">
      {/* Data freshness indicator */}
      <div className="flex items-center gap-2">
        {data.live ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live audience data via Apify
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent border border-border text-muted-foreground text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            {data.fallback ? "Demo data (Apify unavailable)" : "Demo data"}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Analyzed {new Date(data.analyzed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Est. audience"
          value={formatNumber(data.audience_size)}
        />
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Library matches"
          value={String(data.matched_subcultures.length)}
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="New discoveries"
          value={String(data.discovered_subcultures.length)}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Top platform"
          value={data.primary_platforms[0] ?? "—"}
        />
      </div>

      {/* Audience summary */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Search className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <span className="text-sm font-semibold text-foreground">Audience overview — {data.brand_handle}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.audience_summary}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {data.dominant_themes.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px] font-medium">
                {t}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Library matches */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-foreground">Subculture DNA — library matches</h2>
          <span className="ml-auto text-xs text-muted-foreground">{data.matched_subcultures.length} matched</span>
        </div>
        {data.matched_subcultures.map((sub, i) => (
          <MatchedCard key={sub.slug} rank={i + 1} sub={sub} />
        ))}
      </div>

      {/* Discovered subcultures */}
      {data.discovered_subcultures.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">New discoveries — not yet in the library</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {data.discovered_subcultures.length} found
            </span>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-1 space-y-1">
            {data.discovered_subcultures.map((sub, i) => (
              <DiscoveredCard key={sub.provisional_slug} rank={i + 1} sub={sub} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Matched subculture card ──────────────────────────────────────────────────

function MatchedCard({ rank, sub }: { rank: number; sub: MatchedSubculture }) {
  const strengthColors = {
    strong: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    moderate: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    emerging: "text-muted-foreground bg-muted border-border",
  };
  const barColors = {
    strong: "bg-indigo-500",
    moderate: "bg-indigo-400/70",
    emerging: "bg-indigo-300/50",
  };

  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Rank */}
          <div className="flex-shrink-0 w-7 text-right">
            <span className="text-lg font-bold text-muted-foreground/40 leading-none">{rank}</span>
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{sub.name}</span>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {sub.category}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                    strengthColors[sub.match_strength]
                  )}>
                    {sub.match_strength}
                  </span>
                </div>
              </div>
              {/* Match % */}
              <div className="text-right flex-shrink-0">
                <span className="text-xl font-bold text-foreground leading-none">{sub.match_pct}%</span>
                <p className="text-[10px] text-muted-foreground">signal match</p>
              </div>
            </div>

            {/* Match bar */}
            <div className="h-1.5 rounded-full bg-accent overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", barColors[sub.match_strength])}
                style={{ width: `${sub.match_pct}%` }}
              />
            </div>

            {/* Why */}
            <p className="text-xs text-muted-foreground leading-relaxed">{sub.why}</p>

            {/* Signals + link */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap gap-1.5">
                {sub.key_signals.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-indigo-500/8 text-indigo-500 border border-indigo-500/15 text-[11px] font-medium">
                    {s}
                  </span>
                ))}
              </div>
              <Link
                href={`/dashboard/subcultures/${sub.slug}`}
                className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors flex-shrink-0"
              >
                View profile
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Discovered subculture card ───────────────────────────────────────────────

function DiscoveredCard({ rank, sub }: { rank: number; sub: DiscoveredSubculture }) {
  return (
    <Card className="border-transparent bg-card/60 hover:bg-card transition-colors">
      <CardContent className="p-5">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-7 text-right">
            <span className="text-lg font-bold text-amber-500/30 leading-none">{rank}</span>
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{sub.name}</span>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {sub.suggested_category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                    <Zap className="h-2.5 w-2.5" />
                    New
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xl font-bold text-foreground leading-none">~{sub.estimated_audience_pct}%</span>
                <p className="text-[10px] text-muted-foreground">of audience</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed">{sub.description}</p>

            {/* Why new */}
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 px-3 py-2">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <span className="font-semibold">Why this is new: </span>
                {sub.why_new}
              </p>
            </div>

            {/* Signals + generate CTA */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap gap-1.5">
                {sub.key_signals.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-amber-500/8 text-amber-700 dark:text-amber-400 border border-amber-500/15 text-[11px] font-medium">
                    {s}
                  </span>
                ))}
              </div>
              <Link
                href={`/dashboard/subcultures?generate=${encodeURIComponent(sub.name)}`}
                className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:opacity-80 transition-opacity flex-shrink-0 font-medium"
              >
                <Sparkles className="h-3 w-3" />
                Generate profile
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground leading-none">{label}</p>
          <p className="text-lg font-bold text-foreground leading-tight mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AuditSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
      <Skeleton className="h-28 rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-48 rounded" />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-52 rounded" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    </div>
  );
}
