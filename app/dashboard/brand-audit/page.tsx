"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, ChevronDown, Plus, Check, Loader2, FileText, Search, X, History, ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrandAudit } from "@/hooks/use-brand-audit";
import { useAudience } from "@/hooks/use-audience";
import { useCreateBrief } from "@/hooks/use-briefs";
import { useBillingInfo, useCurrentPlan } from "@/hooks/use-billing";
import { getPlan } from "@/lib/plans";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BrandAuditResult, MatchedSubculture, DiscoveredSubculture } from "@/lib/types/brand-audit";
import type { AudienceResult, HandleMap } from "@/lib/platforms/audience";

const PLATFORMS = [
  { value: "all", label: "All platforms" },
  { value: "twitter", label: "X" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "reddit", label: "Reddit" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
] as const;

type PlatformKey = "twitter" | "instagram" | "tiktok" | "reddit" | "youtube" | "pinterest";

const OVERRIDE_PLATFORMS: { key: PlatformKey; label: string; placeholder: string }[] = [
  { key: "twitter",   label: "X",         placeholder: "nike" },
  { key: "instagram", label: "Instagram", placeholder: "nikesportswear" },
  { key: "tiktok",    label: "TikTok",    placeholder: "nikefootball" },
  { key: "reddit",    label: "Reddit",    placeholder: "nike" },
  { key: "youtube",   label: "YouTube",   placeholder: "nikefootball" },
  { key: "pinterest", label: "Pinterest", placeholder: "nike" },
];

const EXAMPLE_HANDLES = ["patagonia", "glossier", "liquiddeath"];

const SESSION_KEY = "culturepulse-audience-audit";

// Shared small pieces ────────────────────────────────────────────────────────

const chip = "inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground";

function SectionHeading({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {meta && <p className="text-sm text-muted-foreground tabular-nums">{meta}</p>}
    </div>
  );
}

/** `className` styles the track (spacing); `fill` overrides the fill color. */
function MeterBar({ value, className, fill = "bg-primary" }: { value: number; className?: string; fill?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// Allowance ──────────────────────────────────────────────────────────────────

/** Brand slots and audits left on the plan, plus any Snapshot credits. */
function AuditAllowance() {
  const plan = getPlan(useCurrentPlan());
  const { data } = useBillingInfo();
  if (!data?.usage) return null;
  const { brandAudits, brandSlots } = plan.limits;
  const credits = data.snapshot?.credits ?? 0;
  const auditsLeft = brandAudits === -1 ? Infinity : Math.max(0, brandAudits - data.usage.brandAuditsThisMonth);
  const parts: string[] = [];
  if (brandAudits !== 0) {
    parts.push(brandAudits === -1 ? "Unlimited Brand Audits (once a day per brand)" : `${auditsLeft} of ${brandAudits} new brands left to audit this month (re-runs are free, once a day)`);
    if (brandSlots !== -1) parts.push(`${data.usage.brands.length} of ${brandSlots} brand${brandSlots === 1 ? "" : "s"} in use`);
  }
  if (credits > 0) parts.push(`${credits} Snapshot audit${credits === 1 ? "" : "s"} ready`);
  const blocked = auditsLeft === 0 && credits === 0;

  return (
    <p className="mt-3 text-sm text-muted-foreground print:hidden">
      {parts.length > 0 ? parts.join(" · ") + "." : "Brand Audits need a plan or a one-time Brand Culture Snapshot."}
      {blocked && (
        <>
          {" "}
          <Link href="/dashboard/billing" className="font-medium text-foreground underline underline-offset-4">
            See plans
          </Link>
        </>
      )}
    </p>
  );
}

// Page ───────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  handle: string;
  platform: string;
  createdAt: string;
}

export default function BrandAuditPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrides, setOverrides] = useState<Partial<Record<PlatformKey, string>>>({});
  const [excluded, setExcluded] = useState<Set<PlatformKey>>(new Set());
  const [cachedAudit, setCachedAudit] = useState<BrandAuditResult | null>(null);
  const [cachedAudience, setCachedAudience] = useState<AudienceResult | null>(null);
  const [submittedHandle, setSubmittedHandle] = useState("");
  const [auditHistory, setAuditHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const { mutate: runAudit, data: auditData, isPending: auditPending, error: auditError, isSuccess: auditDone } = useBrandAudit();
  const { mutate: runAudience, data: audienceData, isPending: audiencePending, isSuccess: audienceDone } = useAudience();

  const isPending = auditPending || audiencePending;
  const error = auditError;

  // Restore last result: URL ?id= param first (admin deep-links), then sessionStorage, then server history
  const urlId = searchParams.get("id");
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      // URL ?id= wins — used by admin "View full profile" links
      if (urlId) {
        try {
          const res = await fetch(`/api/brand-audit?id=${urlId}`);
          if (!cancelled && res.ok) {
            const { handle: h, result } = await res.json() as { handle: string; result: BrandAuditResult };
            if (!cancelled && result) { setHandle(h); setCachedAudit(result); }
          }
        } catch {}
        return;
      }
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          const { audit, audience } = JSON.parse(saved) as { audit?: BrandAuditResult; audience?: AudienceResult };
          if (audit) setCachedAudit(audit);
          if (audience) setCachedAudience(audience);
          return; // session storage wins
        }
      } catch {}
      // No session cache — try server history (covers demo account and returning users)
      try {
        const res = await fetch("/api/brand-audit");
        if (!cancelled && res.ok) {
          const { handle: h, result } = await res.json() as { handle: string; result: BrandAuditResult };
          if (!cancelled && result) { setHandle(h); setCachedAudit(result); }
        }
      } catch {}
    }
    restore();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId]);

  // Load history list (metadata only — no full results until a run is clicked)
  useEffect(() => {
    fetch("/api/brand-audit?history=1")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.logs) setAuditHistory(d.logs); })
      .catch(() => {});
  }, []);

  // Close history dropdown on outside click
  useEffect(() => {
    if (!historyOpen) return;
    function handleClick(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [historyOpen]);

  async function loadHistoryRun(id: string, h: string) {
    setHistoryOpen(false);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/brand-audit?id=${id}`);
      if (res.ok) {
        const { handle: runHandle, result } = await res.json() as { handle: string; result: BrandAuditResult };
        setHandle(runHandle || h);
        setCachedAudit(result);
        setCachedAudience(null);
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ audit: result }));
        } catch {}
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  // Persist to sessionStorage and refresh history list whenever fresh results arrive
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
    // Refresh history metadata after a new run lands
    if (auditData) {
      fetch("/api/brand-audit?history=1")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.logs) setAuditHistory(d.logs); })
        .catch(() => {});
    }
  }, [auditData, audienceData]);

  function handleClearResults() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setCachedAudit(null);
    setCachedAudience(null);
  }

  const displayAudit = auditData ?? cachedAudit;
  const displayAudience = audienceData ?? cachedAudience;
  const isSuccess = auditDone || audienceDone || !!displayAudit || !!displayAudience;
  const overrideCount = Object.values(overrides).filter(Boolean).length;

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

  async function removeBrand(h: string) {
    if (!window.confirm(`Remove @${h}? Its saved audit is deleted and its brand slot is freed.`)) return;
    const res = await fetch(`/api/brand-audit?handle=${encodeURIComponent(h)}`, { method: "DELETE" });
    if (!res.ok) return;
    setAuditHistory((list) => list.filter((e) => e.handle.toLowerCase() !== h.toLowerCase()));
    queryClient.invalidateQueries({ queryKey: ["billing"] });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    const handles = buildHandleMap();
    const excludedPlatforms = Array.from(excluded);
    setSubmittedHandle(handles.default);
    runAudit({ handles, platform, excludedPlatforms });
    runAudience({ handles, platform: platform as never, excludedPlatforms });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        {/* Header */}
        <header>
          <h1 className="text-4xl tracking-tight">Audience Audit</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Enter a brand’s social handle to see which subcultures make up its audience, and which ones haven’t been mapped yet.
          </p>
          <AuditAllowance />
          {searchParams.get("snapshot") && (
            <p role="status" className="mt-4 rounded-lg bg-primary/10 px-4 py-3 text-sm print:hidden">
              Thanks for buying a Brand Culture Snapshot. Enter your brand’s handle below to run your audit, then use
              “Download PDF” to save the report. Your 3 library picks are ready in the Library.
            </p>
          )}
        </header>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mt-8 print:hidden">
          <label htmlFor="audit-handle" className="sr-only">Brand social handle</label>
          <div className="flex items-center gap-2 rounded-xl border border-input bg-card p-2 shadow-sm transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="ml-2 text-lg text-muted-foreground" aria-hidden>@</span>
            <input
              id="audit-handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="brandhandle"
              autoComplete="off"
              spellCheck={false}
              className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {/* Concentric: rounded-xl 12px − p-2 8px = rounded-sm 4px */}
            <Button type="submit" size="lg" className="rounded-sm" disabled={isPending || !handle.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isPending ? "Analyzing…" : "Run audit"}
            </Button>
          </div>

          {!handle && !isSuccess && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Try
              {EXAMPLE_HANDLES.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHandle(h)}
                  className="rounded-md bg-muted px-2 py-0.5 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  @{h}
                </button>
              ))}
            </p>
          )}

          {/* Options */}
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-medium">Platforms</p>
              <div role="radiogroup" aria-label="Platform" className="mt-2 flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={platform === p.value}
                    onClick={() => setPlatform(p.value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      platform === p.value
                        ? "bg-foreground font-medium text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {platform === "all" && (
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="mr-1 text-muted-foreground">Skip:</span>
                {OVERRIDE_PLATFORMS.map(({ key, label }) => {
                  const isExcluded = excluded.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={isExcluded}
                      onClick={() => toggleExclude(key)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors",
                        isExcluded
                          ? "border-foreground/30 bg-muted text-muted-foreground line-through"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      )}
                    >
                      {isExcluded && <X className="h-3 w-3" aria-hidden />}
                      {label}
                    </button>
                  );
                })}
                {excluded.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setExcluded(new Set())}
                    className="ml-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            <div>
              <button
                type="button"
                aria-expanded={showOverrides}
                onClick={() => setShowOverrides((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showOverrides && "rotate-180")} />
                Different handle on some platforms?
                {overrideCount > 0 && <span className="font-medium text-foreground tabular-nums">({overrideCount} set)</span>}
              </button>

              {showOverrides && (
                <div className="mt-3 grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-1 duration-200 sm:grid-cols-2 lg:grid-cols-3">
                  {OVERRIDE_PLATFORMS.map(({ key, label, placeholder }) => {
                    const isExcluded = excluded.has(key);
                    return (
                      <label key={key} className={cn("block", isExcluded && "pointer-events-none opacity-50")}>
                        <span className="text-xs font-medium text-muted-foreground">
                          {label}{isExcluded && " (skipped)"}
                        </span>
                        <span className="relative mt-1 block">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden>@</span>
                          <input
                            type="text"
                            value={overrides[key] ?? ""}
                            onChange={(e) => setOverrides((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={overrides[key] ? "" : (handle.trim().replace(/^@/, "") || placeholder)}
                            disabled={isExcluded}
                            className="h-9 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
                          />
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* History strip */}
        {auditHistory.length > 0 && (
          <div ref={historyRef} className="relative mt-4 print:hidden">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <History className="h-3.5 w-3.5" />
              Your brands
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", historyOpen && "rotate-90")} />
            </button>
            {historyOpen && (
              <div className="absolute left-0 top-full z-10 mt-1.5 w-72 rounded-xl border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                <ul className="divide-y divide-border py-1">
                  {auditHistory.map((entry) => (
                    <li key={entry.id} className="flex items-center">
                      <button
                        onClick={() => loadHistoryRun(entry.id, entry.handle)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5 pl-4 pr-2 text-left transition-colors hover:bg-accent/50"
                      >
                        <span className="truncate font-medium text-sm text-foreground">@{entry.handle}</span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {new Date(entry.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </button>
                      <button
                        onClick={() => removeBrand(entry.handle)}
                        aria-label={`Remove @${entry.handle} and free its brand slot`}
                        title="Remove brand (frees a brand slot)"
                        className="mr-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="mt-8 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error.message}
          </div>
        )}

        {/* History loading */}
        {historyLoading && (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading past audit…
          </div>
        )}

        {/* Loading */}
        {isPending && (
          <div className="mt-12">
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing @{submittedHandle}’s audience across{" "}
              {platform === "all" ? "all platforms" : PLATFORMS.find((p) => p.value === platform)?.label}…
            </p>
            <AuditSkeleton />
          </div>
        )}

        {/* Download as PDF (browser print → Save as PDF) */}
        {!isPending && displayAudit && (
          <div className="mt-6 flex justify-end print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          </div>
        )}

        {/* Results */}
        {!auditPending && displayAudit && (
          <AuditResults data={displayAudit} isCached={!auditDone} onClear={handleClearResults} />
        )}
        {!audiencePending && displayAudience && <CommunityBreakdown data={displayAudience} />}

        {/* Empty */}
        {!isPending && !isSuccess && !error && (
          <div className="mt-12 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <h2 className="text-lg font-semibold">See a brand’s subculture DNA</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              You’ll get the subcultures already in your Library that match its audience, ranked by fit, plus new ones nobody has mapped yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// Results ────────────────────────────────────────────────────────────────────

function AuditResults({ data, isCached, onClear }: { data: BrandAuditResult; isCached?: boolean; onClear?: () => void }) {
  const source = isCached
    ? "Saved from earlier this session"
    : data.live
      ? "Live audience data via Apify"
      : data.fallback ? "Demo data (Apify unavailable)" : "Demo data";

  const stats = [
    { label: "Estimated audience", value: formatNumber(data.audience_size) },
    { label: "Library matches", value: String(data.matched_subcultures?.length ?? 0) },
    { label: "New discoveries", value: String(data.discovered_subcultures?.length ?? 0) },
    { label: "Top platform", value: data.primary_platforms?.[0] ?? "—" },
  ];

  return (
    <div className="mt-12 space-y-12 animate-in fade-in duration-300">
      {/* Overview */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">@{data.brand_handle.replace(/^@/, "")}</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", data.live && !isCached ? "bg-primary" : "bg-muted-foreground")} />
              {source} · {new Date(data.analyzed_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            {isCached && onClear && (
              <button onClick={onClear} className="text-foreground underline-offset-4 hover:underline">
                Clear
              </button>
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 truncate text-2xl font-semibold tracking-tight tabular-nums capitalize">{s.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 max-w-3xl leading-relaxed text-muted-foreground">{data.audience_summary}</p>
        {(data.dominant_themes?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {data.dominant_themes.map((t) => <span key={t} className={chip}>{t}</span>)}
          </div>
        )}
      </section>

      {/* Library matches */}
      <section>
        <SectionHeading
          title="Subculture DNA"
          meta={`${data.matched_subcultures?.length ?? 0} ${(data.matched_subcultures?.length ?? 0) === 1 ? "match" : "matches"} from your Library, ranked by fit`}
        />
        <ol className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border-[1.5px] border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]">
          {(data.matched_subcultures ?? []).map((sub, i) => (
            <MatchedRow key={sub.slug} rank={i + 1} sub={sub} />
          ))}
        </ol>
      </section>

      {/* Discovered */}
      {(data.discovered_subcultures?.length ?? 0) > 0 && (
        <section>
          <SectionHeading
            title="New discoveries"
            meta={`${data.discovered_subcultures?.length ?? 0} ${(data.discovered_subcultures?.length ?? 0) === 1 ? "subculture" : "subcultures"} not yet in your Library`}
          />
          <ol className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border-[1.5px] border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]">
            {(data.discovered_subcultures ?? []).map((sub, i) => (
              <DiscoveredRow key={sub.provisional_slug} rank={i + 1} sub={sub} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

// Matched row ────────────────────────────────────────────────────────────────

const STRENGTH: Record<MatchedSubculture["match_strength"], { label: string; text: string; bar: string }> = {
  strong:   { label: "Strong fit",   text: "text-primary",          bar: "bg-primary" },
  moderate: { label: "Moderate fit", text: "text-foreground",       bar: "bg-primary/60" },
  emerging: { label: "Emerging fit", text: "text-muted-foreground", bar: "bg-primary/35" },
};

function RowShell({ rank, children }: { rank: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 p-5">
      <span className="w-6 shrink-0 pt-0.5 text-right text-sm font-medium tabular-nums text-muted-foreground">{rank}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

function MatchedRow({ rank, sub }: { rank: number; sub: MatchedSubculture }) {
  const { mutate: createBrief, isPending: isGeneratingBrief, data: briefResult, isError: isBriefError, reset: resetBrief } = useCreateBrief();
  const s = STRENGTH[sub.match_strength];

  return (
    <RowShell rank={rank}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold">{sub.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {sub.category} · <span className={cn("font-medium", s.text)}>{s.label}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold leading-none tracking-tight tabular-nums">{sub.match_pct}%</div>
          <div className="mt-1 text-xs text-muted-foreground">signal match</div>
        </div>
      </div>

      <MeterBar value={sub.match_pct} className="mt-3" fill={s.bar} />

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{sub.why}</p>

      {sub.key_signals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sub.key_signals.map((k) => <span key={k} className={chip}>{k}</span>)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {briefResult?.brief ? (
          <Link
            href={`/dashboard/briefs/${briefResult.brief.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />View brief
          </Link>
        ) : isBriefError ? (
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => { resetBrief(); createBrief({ subcultureSlug: sub.slug }); }}>
            <AlertCircle className="h-3.5 w-3.5" />Brief failed. Try again
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={isGeneratingBrief} onClick={() => createBrief({ subcultureSlug: sub.slug })}>
            {isGeneratingBrief ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {isGeneratingBrief ? "Generating brief…" : "Generate brief"}
          </Button>
        )}
        <Link
          href={`/dashboard/subcultures/${sub.slug}`}
          className="group inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View profile
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </RowShell>
  );
}

// Discovered row ─────────────────────────────────────────────────────────────

type AddState = "idle" | "loading" | "done" | "error";

function DiscoveredRow({ rank, sub }: { rank: number; sub: DiscoveredSubculture }) {
  const [addState, setAddState] = useState<AddState>("idle");
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const { mutate: createBrief, isPending: isGeneratingBrief, data: briefResult } = useCreateBrief();
  const canSave = getPlan(useCurrentPlan()).limits.customSubcultures !== 0;

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
    <RowShell rank={rank}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-x-2 font-semibold">
            {sub.name}
            <span className="text-xs font-semibold text-signal">New</span>
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{sub.suggested_category}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold leading-none tracking-tight tabular-nums">~{sub.estimated_audience_pct}%</div>
          <div className="mt-1 text-xs text-muted-foreground">of audience</div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{sub.description}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Why it’s new: </span>
        {sub.why_new}
      </p>

      {sub.key_signals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sub.key_signals.map((k) => <span key={k} className={chip}>{k}</span>)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {addState === "done" && savedSlug ? (
          <>
            <span className="inline-flex h-8 items-center gap-1.5 px-1 text-xs font-medium text-primary animate-in fade-in duration-200">
              <Check className="h-3.5 w-3.5" aria-hidden />Added to Library
            </span>
            {briefResult?.brief ? (
              <Link
                href={`/dashboard/briefs/${briefResult.brief.id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />View brief
              </Link>
            ) : (
              <Button size="sm" variant="outline" disabled={isGeneratingBrief} onClick={() => createBrief({ subcultureSlug: savedSlug })}>
                {isGeneratingBrief ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                {isGeneratingBrief ? "Generating brief…" : "Generate brief"}
              </Button>
            )}
            <Link
              href={`/dashboard/subcultures/${savedSlug}`}
              className="group inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View profile
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </>
        ) : !canSave ? (
          <Link href="/dashboard/billing">
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5" />Add to Library · Pro
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className={cn(addState === "error" && "text-destructive")}
            disabled={addState === "loading"}
            onClick={handleAddToLibrary}
          >
            {addState === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : addState === "error" ? <AlertCircle className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {addState === "loading" ? "Building profile…" : addState === "error" ? "Couldn’t add. Try again" : "Add to Library"}
          </Button>
        )}
      </div>
    </RowShell>
  );
}

// Community breakdown (raw audience data) ────────────────────────────────────

function CommunityBreakdown({ data }: { data: AudienceResult }) {
  if (!data.communities || data.communities.length === 0) return null;

  return (
    <section className="mt-12 animate-in fade-in duration-300">
      <SectionHeading
        title="Where their audience gathers"
        meta={`${data.communities.length} communities · ~${formatNumber(data.estimated_total_audience)} followers`}
      />
      <ol className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border-[1.5px] border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]">
        {data.communities.map((c, i) => (
          <li key={c.community_id ?? i} className="flex items-start gap-4 p-5">
            <span className="w-6 shrink-0 pt-0.5 text-right text-sm font-medium tabular-nums text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{c.community_name}</h3>
                  <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                    {c.platform}
                    {c.community_size != null && <span className="normal-case tabular-nums"> · {formatNumber(c.community_size)} members</span>}
                  </p>
                </div>
                {c.overlap_pct != null && (
                  <div className="w-24 shrink-0 text-right">
                    <div className="text-lg font-semibold leading-none tabular-nums">{c.overlap_pct}%</div>
                    <div className="mt-1 text-xs text-muted-foreground">overlap</div>
                    <MeterBar value={c.overlap_pct} className="mt-2" />
                  </div>
                )}
              </div>
              {c.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              {c.shared_topics && c.shared_topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.shared_topics.slice(0, 4).map((t) => <span key={t} className={chip}>{t}</span>)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Skeleton ───────────────────────────────────────────────────────────────────

function AuditSkeleton() {
  return (
    <div aria-hidden className="mt-6 space-y-12">
      <div>
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-16 w-full" />
      </div>
      <div>
        <Skeleton className="h-7 w-44" />
        <div className="mt-4 divide-y divide-border rounded-2xl border-[1.5px] border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 p-5">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
