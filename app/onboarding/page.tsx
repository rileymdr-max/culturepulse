"use client";

// ─── Swap this URL when the demo video is ready ───────────────────────────────
const VIDEO_URL: string | null = null; // e.g. "https://www.loom.com/embed/abc123"

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Radio, ArrowRight, Play, Loader2, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandAuditResult, MatchedSubculture, DiscoveredSubculture } from "@/lib/types/brand-audit";

// ─── Loading messages that rotate while the audit runs ───────────────────────
const LOADING_MESSAGES = [
  "Scanning Twitter & X for brand mentions…",
  "Pulling TikTok community signals…",
  "Mapping Reddit subcultures…",
  "Checking Instagram hashtag clusters…",
  "Searching YouTube for your audience…",
  "Reading Pinterest board patterns…",
  "Claude is mapping signals to subcultures…",
  "Discovering cultural clusters in your audience…",
  "Almost there — finalizing your profile…",
];

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            n === current ? "w-8 bg-indigo-600" : n < current ? "w-4 bg-indigo-300" : "w-4 bg-border"
          )}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Video ────────────────────────────────────────────────────────────
function StepWatch({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">Welcome to CulturePulse</p>
        <h1 className="text-3xl font-bold text-foreground leading-tight">
          Understand the subcultures<br />your audience actually lives in
        </h1>
        <p className="text-muted-foreground">
          A 90-second walkthrough of how it works — then we'll run a live audit on your brand.
        </p>
      </div>

      {/* Video frame */}
      <div className="w-full aspect-video rounded-2xl border border-border bg-card overflow-hidden relative shadow-sm">
        {VIDEO_URL ? (
          <iframe
            src={VIDEO_URL}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900">
            <div className="h-16 w-16 rounded-full bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center">
              <Play className="h-7 w-7 text-indigo-500 ml-1" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Demo video coming soon</p>
              <p className="text-sm text-muted-foreground mt-0.5">We're putting the finishing touches on it</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
        >
          See what it finds about your brand
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onNext}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip video →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Run audit ────────────────────────────────────────────────────────
function StepAudit({
  onResult,
}: {
  onResult: (handle: string, result: BrandAuditResult) => void;
}) {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      intervalRef.current = setInterval(() => {
        setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
      }, 3500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = handle.trim().replace(/^@/, "");
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    setMsgIdx(0);
    try {
      const res = await fetch("/api/brand-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: trimmed, platform: "all" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Audit failed");
      onResult(trimmed, data as BrandAuditResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto">
      {!loading ? (
        <>
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">Step 2 of 3</p>
            <h2 className="text-3xl font-bold text-foreground">What's your brand's handle?</h2>
            <p className="text-muted-foreground text-sm">
              We'll scan Twitter, TikTok, Reddit, Instagram, YouTube, and Pinterest to surface the
              subcultures your audience actually belongs to.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourbrand"
                autoFocus
                className="w-full pl-8 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={!handle.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Analyze my brand
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            Takes 30–60 seconds · Results are yours to keep in your dashboard
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Radio className="h-7 w-7 text-indigo-500" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-foreground">Scanning @{handle.replace(/^@/, "")}…</p>
            <p
              key={msgIdx}
              className="text-sm text-muted-foreground animate-in fade-in duration-500"
            >
              {LOADING_MESSAGES[msgIdx]}
            </p>
          </div>
          <div className="flex gap-1.5">
            {LOADING_MESSAGES.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 w-6 rounded-full transition-all duration-500",
                  i === msgIdx ? "bg-indigo-600" : i < msgIdx ? "bg-indigo-300" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Results ──────────────────────────────────────────────────────────
function StepResults({
  handle,
  result,
  onEnterDashboard,
}: {
  handle: string;
  result: BrandAuditResult;
  onEnterDashboard: () => void;
}) {
  const top3 = result.matched_subcultures.slice(0, 3);
  const discoveries = result.discovered_subcultures.slice(0, 2);

  const strengthColor: Record<string, string> = {
    strong:   "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    moderate: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    emerging: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">Your brand audit</p>
        <h2 className="text-3xl font-bold text-foreground">
          Here's what we found about{" "}
          <span className="text-indigo-600">@{handle}</span>
        </h2>
        <p className="text-muted-foreground text-sm">{result.audience_summary}</p>
      </div>

      {/* Matched subcultures */}
      <div className="w-full space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Top subcultures in your audience
        </p>
        {top3.map((sc: MatchedSubculture, i: number) => (
          <div key={sc.slug} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
            <span className="text-2xl font-bold text-indigo-200 dark:text-indigo-900 leading-none mt-0.5 w-6 shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{sc.name}</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", strengthColor[sc.match_strength])}>
                  {sc.match_strength}
                </span>
                <span className="ml-auto text-sm font-bold text-indigo-600">{sc.match_pct}%</span>
              </div>
              {/* Match bar */}
              <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                  style={{ width: `${sc.match_pct}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground leading-snug">{sc.why}</p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {sc.key_signals.slice(0, 3).map((sig) => (
                  <span key={sig} className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                    {sig}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Discovered subcultures */}
      {discoveries.length > 0 && (
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              New subcultures discovered in your audience
            </p>
          </div>
          {discoveries.map((sc: DiscoveredSubculture) => (
            <div key={sc.provisional_slug} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-semibold text-foreground">{sc.name}</span>
                <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium px-2 py-0.5 rounded-full">
                  New · {sc.estimated_audience_pct}% of audience
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">{sc.description}</p>
            </div>
          ))}
        </div>
      )}

      <div className="w-full flex flex-col items-center gap-3">
        <button
          onClick={onEnterDashboard}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Explore your full dashboard
          <ChevronRight className="h-4 w-4" />
        </button>
        <p className="text-xs text-muted-foreground">
          Your full audit lives in the Brand Audit tab — run it on any brand at any time.
        </p>
      </div>
    </div>
  );
}

// ─── Main onboarding shell ────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [auditHandle, setAuditHandle] = useState("");
  const [auditResult, setAuditResult] = useState<BrandAuditResult | null>(null);

  async function handleEnterDashboard() {
    // Mark onboarding complete — fire and forget, don't block navigation
    fetch("/api/onboarding", { method: "POST" }).catch(() => {});
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-screen-md mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="h-5 w-5 text-indigo-500" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            </div>
            <span className="font-bold text-foreground tracking-tight text-sm">CulturePulse</span>
          </div>
          <Steps current={step} />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12 overflow-y-auto">
        <div className="w-full">
          {step === 1 && <StepWatch onNext={() => setStep(2)} />}
          {step === 2 && (
            <StepAudit
              onResult={(h, r) => {
                setAuditHandle(h);
                setAuditResult(r);
                setStep(3);
              }}
            />
          )}
          {step === 3 && auditResult && (
            <StepResults
              handle={auditHandle}
              result={auditResult}
              onEnterDashboard={handleEnterDashboard}
            />
          )}
        </div>
      </main>
    </div>
  );
}
