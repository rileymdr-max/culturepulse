"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_ROOT, BTN_GO, CARD, D, M, STICKER, Wordmark } from "@/components/marketing/brand";
import { FormNotice } from "@/components/marketing/auth-shell";
import { DemoVideoButton } from "@/components/marketing/demo-video-button";
import type { BrandAuditResult, MatchedSubculture, DiscoveredSubculture } from "@/lib/types/brand-audit";
import { useBillingInfo, useCheckout, useCurrentPlan } from "@/hooks/use-billing";
import { PLANS, SNAPSHOT } from "@/lib/plans";

// ─── Loading messages that rotate while the audit runs ───────────────────────
const LOADING_MESSAGES = [
  "Scanning X for brand mentions…",
  "Pulling TikTok community signals…",
  "Mapping Reddit subcultures…",
  "Checking Instagram hashtag clusters…",
  "Searching YouTube for your audience…",
  "Reading Pinterest board patterns…",
  "Claude is mapping signals to subcultures…",
  "Discovering cultural clusters in your audience…",
  "Almost there — finalizing your profile…",
];

const KICKER = cn(M, "text-xs font-medium uppercase tracking-[0.1em] text-[#0B6B45]");

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current }: { current: 1 | 2 }) {
  return (
    <div className="hidden items-center gap-3 sm:flex">
      <span className={cn(M, "hidden text-xs text-[#66625A] sm:inline")}>Step {current} of 2</span>
      <div className="flex items-center gap-1.5" aria-hidden>
        {[1, 2].map((n) => (
          <div
            key={n}
            className={cn(
              "h-2.5 rounded-full border-2 border-[#111110] transition-all duration-500",
              n === current ? "w-9 bg-[#0B6B45]" : n < current ? "w-4 bg-[#0B6B45]" : "w-4 bg-transparent"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Step 1: Run audit ────────────────────────────────────────────────────────
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
        body: JSON.stringify({ handles: { default: trimmed }, platform: "all" }),
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
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-10">
      {!loading ? (
        <>
          <div className="space-y-4 text-center">
            <p className={KICKER}>Welcome to CulturePulse</p>
            <h1 className={cn(D, "text-5xl leading-[0.92] sm:text-6xl")}>What&rsquo;s your brand&rsquo;s handle?</h1>
            <p className="text-[17px] text-[#3B3832]">
              We&rsquo;ll scan X, TikTok, Reddit, Instagram, YouTube and Pinterest to surface the subcultures your
              audience actually belongs to.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={cn(CARD, "w-full space-y-5 p-6 sm:p-7")}>
            {error && <FormNotice tone="error">{error}</FormNotice>}
            <label htmlFor="handle" className="sr-only">
              Brand handle
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[#66625A]">
                @
              </span>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourbrand"
                autoFocus
                className="w-full rounded-full border-2 border-[#111110] bg-white py-4 pl-10 pr-5 text-lg placeholder:text-[#8F8A80] focus:outline-none focus:ring-4 focus:ring-[#0B6B45]/25"
              />
            </div>
            <button type="submit" disabled={!handle.trim()} className={cn(BTN_GO, "w-full")}>
              Analyze my brand
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </form>

          <p className={cn(M, "text-center text-xs text-[#66625A]")}>
            Takes 30–60 seconds · Results stay in your dashboard
          </p>
          <DemoVideoButton variant="link">Watch the 54-second demo first</DemoVideoButton>
        </>
      ) : (
        <div className={cn(CARD, "flex w-full flex-col items-center gap-6 px-6 py-10")} aria-live="polite">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border-[5px] border-[#C7F2D9]" />
            <div className="absolute inset-0 animate-spin rounded-full border-[5px] border-transparent border-t-[#0B6B45]" />
          </div>
          <div className="space-y-2 text-center">
            <p className={cn(D, "text-3xl")}>Scanning @{handle.replace(/^@/, "")}</p>
            <p key={msgIdx} className="animate-in fade-in text-[15px] text-[#4A463F] duration-500">
              {LOADING_MESSAGES[msgIdx]}
            </p>
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {LOADING_MESSAGES.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 w-6 rounded-full transition-all duration-500",
                  i <= msgIdx ? "bg-[#0B6B45]" : "bg-[#DDD6C8]"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Results ──────────────────────────────────────────────────────────
const STRENGTH: Record<string, string> = {
  strong: "bg-[#0B6B45] text-white",
  moderate: "bg-[#C7F2D9] text-[#0B4A30]",
  emerging: "bg-[#F2EDE3] text-[#4A463F]",
};

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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10">
      <div className="space-y-4 text-center">
        <p className={KICKER}>Your brand audit</p>
        <h2 className={cn(D, "text-5xl leading-[0.92] sm:text-6xl")}>
          Here&rsquo;s what we found about <span className="text-[#0B6B45]">@{handle}</span>
        </h2>
        <p className="mx-auto max-w-2xl text-[17px] text-[#3B3832]">{result.audience_summary}</p>
      </div>

      {/* Matched subcultures */}
      <section className="w-full">
        <h3 className={cn(D, "mb-4 text-2xl")}>Top subcultures in your audience</h3>
        <div className={cn(CARD, "overflow-hidden")}>
          {top3.map((sc: MatchedSubculture, i: number) => (
            <div
              key={sc.slug}
              className={cn("grid grid-cols-[32px_1fr] gap-4 p-5 sm:p-6", i > 0 && "border-t-2 border-[#111110]")}
            >
              <span className={cn(D, "text-3xl leading-none text-[#0B6B45]")}>{i + 1}</span>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(D, "text-2xl")}>{sc.name}</span>
                  <span
                    className={cn(
                      "rounded-full border-2 border-[#111110] px-2.5 py-0.5 text-xs font-bold capitalize",
                      STRENGTH[sc.match_strength] ?? STRENGTH.emerging
                    )}
                  >
                    {sc.match_strength}
                  </span>
                  <span className={cn(D, "ml-auto text-3xl tabular-nums text-[#0B6B45]")}>{sc.match_pct}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border-2 border-[#111110] bg-[#F2EDE3]">
                  <div
                    className="h-full bg-[#0B6B45] transition-all duration-1000"
                    style={{ width: `${sc.match_pct}%` }}
                  />
                </div>
                <p className="text-[15px] leading-snug text-[#4A463F]">{sc.why}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sc.key_signals.slice(0, 3).map((sig) => (
                    <span key={sig} className={cn(M, "rounded-full bg-[#F2EDE3] px-2.5 py-1 text-[11px]")}>
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Discovered subcultures */}
      {discoveries.length > 0 && (
        <section className="w-full">
          <h3 className={cn(D, "mb-4 flex items-center gap-2 text-2xl")}>
            <Zap className="h-5 w-5 fill-[#FFE14D] text-[#111110]" aria-hidden />
            New subcultures discovered in your audience
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {discoveries.map((sc: DiscoveredSubculture, i: number) => (
              <div
                key={sc.provisional_slug}
                className={cn(CARD, "bg-[#FFF6C2] p-5", i === 0 ? "sm:-rotate-1" : "sm:rotate-1")}
              >
                <span className={cn(STICKER, "bg-[#FFE14D] px-3 py-1 text-xs shadow-none")}>
                  New · {sc.estimated_audience_pct}% of audience
                </span>
                <p className={cn(D, "mt-3 text-2xl")}>{sc.name}</p>
                <p className="mt-1 text-[15px] leading-snug text-[#4A463F]">{sc.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex w-full flex-col items-center gap-4">
        <button onClick={onEnterDashboard} className={cn(BTN_GO, "w-full sm:w-auto")}>
          Explore your full dashboard
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>
        <p className="text-center text-sm text-[#66625A]">
          Your full audit lives in the Brand Audit tab. Run it on any brand, any time.
        </p>
      </div>
    </div>
  );
}

// ─── Main onboarding shell ────────────────────────────────────────────────────
/** Shown when the account has no plan and no Snapshot credit to run an audit with. */
function StepStart({ onSeePlans }: { onSeePlans: () => void }) {
  const { mutate: checkout, isPending, error } = useCheckout();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10">
      <div className="space-y-4 text-center">
        <p className={KICKER}>Welcome to CulturePulse</p>
        <h1 className={cn(D, "text-5xl leading-[0.92] sm:text-6xl")}>Choose how to start</h1>
        <p className="text-[17px] text-[#3B3832]">
          Start with a one-time audit of your brand, or go straight to a plan.
        </p>
      </div>
      {error && <FormNotice tone="error">{error.message}</FormNotice>}
      <div className="grid w-full gap-6 sm:grid-cols-2">
        <div className={cn(CARD, "flex flex-col p-6")}>
          <h2 className={cn(D, "text-2xl")}>{SNAPSHOT.name}</h2>
          <p className={cn(D, "mt-3 text-4xl")}>${SNAPSHOT.price}</p>
          <ul className="mt-5 flex-1 space-y-2 text-[15px]">
            {SNAPSHOT.features.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
          <button
            type="button"
            disabled={isPending}
            onClick={() => checkout({ item: "snapshot" })}
            className={cn(BTN_GO, "mt-6 w-full")}
          >
            {isPending ? "Opening checkout…" : "Get my Snapshot"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className={cn(CARD, "flex flex-col p-6")}>
          <h2 className={cn(D, "text-2xl")}>A plan</h2>
          <p className={cn(D, "mt-3 text-4xl")}>From ${PLANS.starter.price}/mo</p>
          <p className="mt-5 flex-1 text-[15px] text-[#3B3832]">
            Monthly Brand Audits, library access, live monitors and content briefs. Agencies managing many brands
            should look at Studio or Enterprise.
          </p>
          <button type="button" onClick={onSeePlans} className={cn(BTN_GO, "mt-6 w-full bg-transparent text-[#111110]")}>
            See plans
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [auditHandle, setAuditHandle] = useState("");
  const [auditResult, setAuditResult] = useState<BrandAuditResult | null>(null);
  const plan = PLANS[useCurrentPlan()];
  const { data: billing, isLoading: billingLoading } = useBillingInfo();
  const canAudit = plan.limits.brandAudits !== 0 || (billing?.snapshot?.credits ?? 0) > 0;

  async function handleEnterDashboard() {
    // Mark onboarding complete. Wait briefly so a later visit to "/" doesn't bounce back here,
    // but never block navigation on it for long.
    await Promise.race([
      fetch("/api/onboarding", { method: "POST" }).catch(() => {}),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
    router.push("/dashboard");
  }

  return (
    <div className={cn(BRAND_ROOT, "flex min-h-screen flex-col overflow-x-hidden")}>
      <header className="sticky top-0 z-30 border-b-2 border-[#111110] bg-[#F2EDE3]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between px-4 sm:px-6 lg:px-11">
          <Wordmark />
          <div className="flex items-center gap-5 sm:gap-7">
            <Steps current={step} />
            <button
              type="button"
              onClick={handleEnterDashboard}
              className="text-sm font-bold text-[#111110] underline decoration-2 underline-offset-4 hover:text-[#0B6B45]"
            >
              Skip to dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="w-full">
          {step === 1 && !billingLoading && !canAudit && (
            <StepStart
              onSeePlans={async () => {
                await fetch("/api/onboarding", { method: "POST" }).catch(() => {});
                router.push("/dashboard/billing");
              }}
            />
          )}
          {step === 1 && canAudit && (
            <StepAudit
              onResult={(h, r) => {
                setAuditHandle(h);
                setAuditResult(r);
                setStep(2);
              }}
            />
          )}
          {step === 2 && auditResult && (
            <StepResults handle={auditHandle} result={auditResult} onEnterDashboard={handleEnterDashboard} />
          )}
        </div>
      </main>
    </div>
  );
}
