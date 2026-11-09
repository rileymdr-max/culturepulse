"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, Users, Layers, AlertCircle, ChevronRight, TrendingUp, Zap, ChevronDown, Plus, CheckCircle2, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrandAudit } from "@/hooks/use-brand-audit";
import { useAudience } from "@/hooks/use-audience";
import { useCreateBrief } from "@/hooks/use-briefs";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BrandAuditResult, MatchedSubculture, DiscoveredSubculture } from "@/lib/types/brand-audit";
import type { AudienceResult, HandleMap } from "@/lib/platforms/audience";

const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "twitter", label: "X / Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "reddit", label: "Reddit" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
] as const;

type PlatformKey = "twitter" | "instagram" | "tiktok" | "reddit" | "youtube" | "pinterest";

const OVERRIDE_PLATFORMS: { key: PlatformKey; label: string; placeholder: string }[] = [
  { key: "twitter",   label: "X / Twitter", placeholder: "e.g. nike" },
  { key: "instagram", label: "Instagram",   placeholder: "e.g. nikesportswear" },
  { key: "tiktok",    label: "TikTok",      placeholder: "e.g. nikefootball" },
  { key: "reddit",    label: "Reddit",      placeholder: "e.g. nike" },
  { key: "youtube",   label: "YouTube",     placeholder: "e.g. nikefootball" },
  { key: "pinterest", label: "Pinterest",   placeholder: "e.g. nike" },
];

const SESSION_KEY = "culturepulse-audience-audit";

export default function BrandAuditPage() {
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrides, setOverrides] = useState<Partial<Record<PlatformKey, string>>>({});
  const [excluded, setExcluded] = useState<Set<PlatformKey>>(new Set());
  const [cachedAudit, setCachedAudit] = useState<BrandAuditResult | null>(null);
  const [cachedAudience, setCachedAudience] = useState<AudienceResult | null>(null);

  const { mutate: runAudit, data: auditData, isPending: auditPending, error: auditError, isSuccess: auditDone } = useBrandAudit();
  const { mutate: runAudience, data: audienceData, isPending: audiencePending, isSuccess: audienceDone } = useAudience();

  const isPending = auditPending || audiencePending;
  const error = auditError;

  // Restore last result from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { audit, audience } = JSON.parse(saved) as { audit?: BrandAuditResult; audience?: AudienceResult };
        if (audit) setCachedAudit(audit);
        if (audience) setCachedAudience(audience);
      }
    } catch {}
  }, []);

  // Persist to sessionStorage whenever fresh results arrive
  useEffect(() => {
    if (!auditData && !audienceData) return;
    try {
      const existing = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}");
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        ...existing,
        ...(auditData ? { audit: auditData } : {}),
        ...(audienceData ? { audience: audienceData } : {}),
      }));
      if (auditData) setCachedAudit(auditData);
      if (audienceData) setCachedAudience(audienceData);
    } catch {}
  }, [auditData, audienceData]);

  function handleClearResults() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setCachedAudit(null);
    setCachedAudience(null);
  }

  const displayAudit = auditData ?? cachedAudit;
  const displayAudience = audienceData ?? cachedAudience;
  const isSuccess = auditDone || audienceDone || !!displayAudit || !!displayAudience;

  function toggleExclude(key: PlatformKey) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function buildHandleMap(): HandleMap {
    const defaultHandle = handle.trim().replace(/^@/, "");
    const map: HandleMap = { default: defaultHandle };
    for (const { key } of OVERRIDE_PLATFORMS) {
      const v = overrides[key]?.trim().replace(/^@/, "");
      if (v) map[key] = v;
    }
    return map;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    const handles = buildHandleMap();
    const excludedPlatforms = Array.from(excluded);
    runAudit({ handles, platform, excludedPlatforms });
    runAudience({ handles, platform: platform as never, excludedPlatforms });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audience Audit</h1>
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
              Enter the brand&apos;s handle — use the same one across platforms, or set per-platform handles below.
            </p>
          </div>

          {/* Platform selector */}
          <div className="space-y-2">
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

            {/* Exclude platforms — only relevant when running "all" */}
            {platform === "all" && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground">Exclude:</span>
                {OVERRIDE_PLATFORMS.map(({ key, label }) => {
                  const isExcluded = excluded.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleExclude(key)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                        isExcluded
                          ? "bg-red-500/10 text-red-500 border-red-500/30 line-through"
                          : "bg-background text-muted-foreground border-border hover:border-red-400/50 hover:text-red-400"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
                {excluded.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setExcluded(new Set())}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
                  >
                    clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Per-platform handle overrides */}
          <div>
            <button
              type="button"
              onClick={() => setShowOverrides((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showOverrides && "rotate-180")} />
              Per-platform handles
              {Object.values(overrides).some(Boolean) && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 text-[10px] font-bold">
                  {Object.values(overrides).filter(Boolean).length} overrides
                </span>
              )}
            </button>

            {showOverrides && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OVERRIDE_PLATFORMS.map(({ key, label, placeholder }) => {
                  const isExcluded = excluded.has(key);
                  return (
                    <div key={key} className={cn("space-y-1", isExcluded && "opacity-40 pointer-events-none")}>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
                        {isExcluded && <span className="text-[10px] text-red-500 font-medium">(excluded)</span>}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">@</span>
                        <input
                          type="text"
                          value={overrides[key] ?? ""}
                          onChange={(e) => setOverrides((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={overrides[key] ? "" : (handle.trim().replace(/^@/, "") || placeholder)}
                          disabled={isExcluded}
                          className="w-full pl-6 pr-3 py-1.5 rounded-md border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
        {(auditPending || audiencePending) && <AuditSkeleton />}

        {/* Results — show each section as it arrives, or from session cache */}
        {!auditPending && displayAudit && (
          <AuditResults data={displayAudit} isCached={!auditDone} onClear={handleClearResults} />
        )}
        {!audiencePending && displayAudience && (
          <CommunityBreakdown data={displayAudience} />
        )}

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

function AuditResults({ data, isCached, onClear }: { data: BrandAuditResult; isCached?: boolean; onClear?: () => void }) {
  return (
    <div className="space-y-8">
      {/* Data freshness indicator */}
      <div className="flex items-center gap-2">
        {isCached && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent border border-border text-muted-foreground text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            Session result
          </span>
        )}
        {!isCached && data.live ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live audience data via Apify
          </span>
        ) : !isCached ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent border border-border text-muted-foreground text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            {data.fallback ? "Demo data (Apify unavailable)" : "Demo data"}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          Analyzed {new Date(data.analyzed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        {isCached && onClear && (
          <button
            onClick={onClear}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Clear results
          </button>
        )}
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
          value={String(data.matched_subcultures?.length ?? 0)}
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="New discoveries"
          value={String(data.discovered_subcultures?.length ?? 0)}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Top platform"
          value={data.primary_platforms?.[0] ?? "—"}
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
            {(data.dominant_themes ?? []).map((t) => (
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
          <span className="ml-auto text-xs text-muted-foreground">{data.matched_subcultures?.length ?? 0} matched</span>
        </div>
        {(data.matched_subcultures ?? []).map((sub, i) => (
          <MatchedCard key={sub.slug} rank={i + 1} sub={sub} />
        ))}
      </div>

      {/* Discovered subcultures */}
      {(data.discovered_subcultures?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">New discoveries — not yet in the library</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {data.discovered_subcultures?.length ?? 0} found
            </span>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-1 space-y-1">
            {(data.discovered_subcultures ?? []).map((sub, i) => (
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
  const { mutate: createBrief, isPending: isGeneratingBrief, data: briefResult, isError: isBriefError, reset: resetBrief } = useCreateBrief();

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

            {/* Signals + actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap gap-1.5">
                {sub.key_signals.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-indigo-500/8 text-indigo-500 border border-indigo-500/15 text-[11px] font-medium">
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {briefResult?.brief ? (
                  <Link
                    href={`/dashboard/briefs/${briefResult.brief.id}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors font-medium"
                  >
                    <FileText className="h-3 w-3" />
                    View brief
                  </Link>
                ) : isBriefError ? (
                  <button
                    onClick={() => { resetBrief(); createBrief({ subcultureSlug: sub.slug }); }}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Failed — retry?
                  </button>
                ) : (
                  <button
                    onClick={() => createBrief({ subcultureSlug: sub.slug })}
                    disabled={isGeneratingBrief}
                    className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingBrief ? (
                      <><Loader2 className="h-3 w-3 animate-spin" />Generating…</>
                    ) : (
                      <><FileText className="h-3 w-3" />Generate brief</>
                    )}
                  </button>
                )}
                <Link
                  href={`/dashboard/subcultures/${sub.slug}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View profile
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Discovered subculture card ───────────────────────────────────────────────

type AddState = "idle" | "loading" | "done" | "error";

function DiscoveredCard({ rank, sub }: { rank: number; sub: DiscoveredSubculture }) {
  const [addState, setAddState] = useState<AddState>("idle");
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const { mutate: createBrief, isPending: isGeneratingBrief, data: briefResult } = useCreateBrief();

  async function handleAddToLibrary() {
    setAddState("loading");
    try {
      const seed = [
        sub.description,
        `Key signals: ${sub.key_signals.join(", ")}.`,
        `Why this is a new subculture: ${sub.why_new}`,
      ].join(" ");

      const res = await fetch("/api/subcultures/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sub.name, seed, save: true }),
      });

      if (!res.ok) throw new Error("Failed");
      const { subculture } = await res.json();
      setSavedSlug(subculture?.slug ?? null);
      setAddState("done");
    } catch {
      setAddState("error");
      setTimeout(() => setAddState("idle"), 3000);
    }
  }

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

            {/* Signals + actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap gap-1.5">
                {sub.key_signals.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-amber-500/8 text-amber-700 dark:text-amber-400 border border-amber-500/15 text-[11px] font-medium">
                    {s}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {addState === "done" && savedSlug ? (
                  <>
                    <Link
                      href={`/dashboard/subcultures/${savedSlug}`}
                      className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium hover:opacity-80 transition-opacity"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      View profile
                    </Link>
                    {briefResult?.brief ? (
                      <Link
                        href={`/dashboard/briefs/${briefResult.brief.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors font-medium"
                      >
                        <FileText className="h-3 w-3" />
                        View brief
                      </Link>
                    ) : (
                      <button
                        onClick={() => createBrief({ subcultureSlug: savedSlug })}
                        disabled={isGeneratingBrief}
                        className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingBrief ? (
                          <><Loader2 className="h-3 w-3 animate-spin" />Generating…</>
                        ) : (
                          <><FileText className="h-3 w-3" />Generate brief</>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleAddToLibrary}
                    disabled={addState === "loading"}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium transition-opacity",
                      addState === "error"
                        ? "text-red-500"
                        : "text-amber-600 dark:text-amber-400 hover:opacity-80",
                      addState === "loading" && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {addState === "loading" ? (
                      <><Loader2 className="h-3 w-3 animate-spin" />Generating…</>
                    ) : addState === "error" ? (
                      <>Failed — retry?</>
                    ) : (
                      <><Plus className="h-3 w-3" />Add to library</>
                    )}
                  </button>
                )}
              </div>
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

// ─── Community Breakdown (Apify raw audience data) ────────────────────────────

function CommunityBreakdown({ data }: { data: AudienceResult }) {
  if (!data.communities || data.communities.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-emerald-500" />
        <h2 className="text-sm font-semibold text-foreground">Where their audience hangs out</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {data.communities.length} communities · est. {formatNumber(data.estimated_total_audience)} followers
        </span>
      </div>
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] overflow-hidden divide-y divide-border">
        {data.communities.map((c, i) => (
          <div key={c.community_id ?? i} className="flex items-center gap-4 px-5 py-4 hover:bg-accent/40 transition-colors">
            {/* Rank */}
            <span className="text-sm font-bold text-muted-foreground/40 w-6 text-right shrink-0">{i + 1}</span>

            {/* Name + platform */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground truncate">{c.community_name}</span>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">
                  {c.platform}
                </span>
              </div>
              {c.description && (
                <p className="text-xs text-muted-foreground truncate">{c.description}</p>
              )}
              {c.shared_topics && c.shared_topics.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {c.shared_topics.slice(0, 4).map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded-full bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border border-emerald-500/15 text-[10px] font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="shrink-0 text-right space-y-1">
              {c.overlap_pct != null && (
                <div>
                  <span className="text-base font-bold text-foreground leading-none">{c.overlap_pct}%</span>
                  <p className="text-[10px] text-muted-foreground">overlap</p>
                </div>
              )}
              {c.community_size != null && (
                <p className="text-[10px] text-muted-foreground">{formatNumber(c.community_size)} members</p>
              )}
            </div>

            {/* Overlap bar */}
            {c.overlap_pct != null && (
              <div className="hidden sm:block w-20 shrink-0">
                <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500/70 transition-all"
                    style={{ width: `${Math.min(c.overlap_pct, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
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
