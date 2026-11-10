"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, AlertCircle, Bell, Check, Loader2, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { signalTier, TIER_STYLE } from "@/lib/signal-tier";
import { useSubculture } from "@/hooks/use-subcultures";
import { useMonitors, useCreateMonitor, type MonitorData } from "@/hooks/use-monitors";
import { useCreateBrief, useBriefs } from "@/hooks/use-briefs";

const chip = "inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-sm text-foreground";
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SENTIMENT_TEXT: Record<string, string> = {
  revered: "text-primary",
  respected: "text-foreground",
  controversial: "text-tier-trending",
  villainized: "text-destructive",
};

// Layout pieces ──────────────────────────────────────────────────────────────

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Short terms render as chips; phrases (long average length) render as a list.
 * Long lists show the first `limit` items with a Show all toggle.
 */
function Chips({ items, limit = 15 }: { items: string[]; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <p className="text-sm text-muted-foreground">None recorded yet.</p>;

  const avg = items.reduce((n, s) => n + s.length, 0) / items.length;
  const asList = avg > 26;
  const shown = expanded ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;

  return (
    <div>
      {asList ? (
        <ul className="space-y-1.5 text-sm leading-relaxed">
          {shown.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((item) => <span key={item} className={chip}>{item}</span>)}
        </div>
      )}
      {items.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${items.length}`}
          {!expanded && <span className="sr-only"> ({hidden} more)</span>}
        </button>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium">{children}</h3>;
}

// Live signal ────────────────────────────────────────────────────────────────

function LiveSignal({ monitor }: { monitor: MonitorData }) {
  const { signal } = monitor;
  const hasData = monitor.snapshots.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-5 py-4 text-sm">
        <span className="text-muted-foreground">
          On your Signal Board. The Breakout Score appears after the first run; monitors refresh every 6 hours.
        </span>
        <Link href="/dashboard/monitors" className="group inline-flex items-center gap-1 font-medium text-primary">
          Open Signal Board
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    );
  }

  const tier = signalTier(signal);
  const style = TIER_STYLE[tier];
  const MomentumIcon = signal.momentum === "rising" ? TrendingUp : signal.momentum === "falling" ? TrendingDown : Minus;
  const PLATFORM_LABEL: Record<string, string> = {
    reddit: "Reddit", twitter: "X", tiktok: "TikTok", youtube: "YouTube", instagram: "Instagram", trends: "Google Trends",
  };
  const perPlatform = Object.entries(signal.platform)
    .map(([p, a]) => ({ label: PLATFORM_LABEL[p] ?? p, v: a?.velocity ?? null }))
    .filter((x): x is { label: string; v: number } => x.v !== null);

  return (
    <section
      aria-label="Live signal"
      className={cn("rounded-xl border bg-card p-5", tier === "breakout" ? "border-tier-breakout/50" : "border-border")}
    >
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-4xl font-semibold leading-none tracking-tight tabular-nums", style.text)}>{signal.breakoutScore}</span>
            <span className={cn("text-sm font-semibold", style.text)}>{style.label}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Breakout Score</p>
        </div>
        <div>
          <p className={cn("text-sm font-medium tabular-nums", signal.velocity > 0 && style.text)}>{signed(signal.velocity)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Velocity</p>
        </div>
        <div>
          <p className={cn("inline-flex items-center gap-1 text-sm font-medium capitalize", signal.momentum === "falling" && "text-muted-foreground")}>
            <MomentumIcon className="h-4 w-4" aria-hidden />{signal.momentum}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Momentum</p>
        </div>
        {perPlatform.length > 0 && (
          <div>
            <p className="text-sm font-medium tabular-nums">{perPlatform.map(({ label, v }) => `${label} ${signed(v)}`).join(" · ")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">By platform</p>
          </div>
        )}
        <Link href="/dashboard/monitors" className="group ml-auto inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          Signal Board
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

// Page ───────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

const backLink = (
  <Link href="/dashboard/subcultures" className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />Library
  </Link>
);

export default function SubcultureDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useSubculture(slug);
  const s = data?.subculture;

  const { data: monitorsData } = useMonitors(s?.id);
  const existingMonitor = monitorsData?.monitors?.[0];
  const { mutate: startMonitor, isPending: isStartingMonitor } = useCreateMonitor();
  const { mutate: createBrief, isPending: isGeneratingBrief, data: briefResult } = useCreateBrief();
  const { data: briefsData } = useBriefs(s?.id);
  const latestBrief = briefsData?.briefs?.[0];

  if (isLoading) {
    return (
      <Shell>
        <div aria-hidden>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-8 h-4 w-28" />
          <Skeleton className="mt-3 h-9 w-72" />
          <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !s) {
    return (
      <Shell>
        {backLink}
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <h1 className="text-lg font-semibold">We couldn’t find that profile</h1>
          <p className="mt-2 text-muted-foreground">It may have been removed from the Library.</p>
        </div>
      </Shell>
    );
  }

  const generate = () => createBrief({ subcultureId: s.id, monitorId: existingMonitor?.id });

  return (
    <Shell>
      {backLink}

      {/* Header */}
      <header className="mt-8 flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
        <div className="min-w-0 max-w-3xl">
          <p className="text-sm text-muted-foreground">
            {s.category}
            {s.status !== "approved" && <span className="font-medium text-tier-trending"> · Draft</span>}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{s.name}</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{s.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {existingMonitor ? (
            <Link href="/dashboard/monitors" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <Check className="h-4 w-4 text-primary" aria-hidden />Monitoring
            </Link>
          ) : (
            <Button variant="outline" disabled={isStartingMonitor} onClick={() => startMonitor({ subcultureId: s.id })}>
              {isStartingMonitor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              {isStartingMonitor ? "Starting…" : "Start monitoring"}
            </Button>
          )}

          {briefResult?.brief ? (
            <Link
              href={`/dashboard/briefs/${briefResult.brief.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Check className="h-4 w-4" aria-hidden />View new brief
            </Link>
          ) : (
            <>
              {latestBrief && (
                <Link
                  href={`/dashboard/briefs/${latestBrief.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <FileText className="h-4 w-4" aria-hidden />Latest brief
                </Link>
              )}
              <Button disabled={isGeneratingBrief} onClick={generate}>
                {isGeneratingBrief ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {isGeneratingBrief ? "Generating brief…" : latestBrief ? "New brief" : "Generate brief"}
              </Button>
            </>
          )}
        </div>
      </header>

      {existingMonitor && <div className="mt-8"><LiveSignal monitor={existingMonitor} /></div>}

      {/* Language */}
      <div className="mt-12 grid gap-x-12 gap-y-10 border-t border-border pt-10 md:grid-cols-3">
        <Section title="Keywords"><Chips items={s.keywords} /></Section>
        <Section title="Vernacular"><Chips items={s.vernacular} /></Section>
        <Section title="Behaviors"><Chips items={s.categoricalBehaviors} /></Section>
      </div>

      {/* Moments + icons */}
      <div className="mt-12 grid gap-x-12 gap-y-10 border-t border-border pt-10 md:grid-cols-2">
        <Section title="Moments and triggers">
          <ul className="space-y-4">
            {s.moments.map((m) => (
              <li key={m.name}>
                <p className="font-medium">{m.name}</p>
                <p className="text-sm font-medium text-primary">{m.timing}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Icons and entities">
          <ul className="space-y-3">
            {s.icons.map((icon) => (
              <li key={icon.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{icon.name}</span>
                  <span className={cn("shrink-0 text-sm", SENTIMENT_TEXT[icon.sentiment] ?? "text-muted-foreground")}>{cap(icon.sentiment)}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{icon.role}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Platforms + psychographics */}
      <div className="mt-12 grid gap-x-12 gap-y-10 border-t border-border pt-10 md:grid-cols-2">
        <Section title="Platforms">
          <ul className="space-y-3">
            {s.platforms.map((p) => (
              <li key={p.platform}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{p.platform}</span>
                  <span className={cn("shrink-0 text-sm", p.engagement_level === "primary" ? "font-medium text-primary" : "text-muted-foreground")}>
                    {cap(p.engagement_level)}
                  </span>
                </div>
                {p.content_formats.length > 0 && <p className="mt-0.5 text-sm text-muted-foreground">{p.content_formats.join(", ")}</p>}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Psychographics">
          <dl className="space-y-5">
            <div>
              <dt><Label>Who they look up to</Label></dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.psychographics.hero}</dd>
            </div>
            <div>
              <dt><Label>Who they push back against</Label></dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.psychographics.villain}</dd>
            </div>
            <div>
              <dt><Label>Core values</Label></dt>
              <dd className="mt-2"><Chips items={s.psychographics.core_values} /></dd>
            </div>
            <div>
              <dt><Label>Motivations</Label></dt>
              <dd className="mt-2"><Chips items={s.psychographics.motivations} /></dd>
            </div>
          </dl>
        </Section>
      </div>

      {/* Brand fit + adjacent */}
      <div className="mt-12 grid gap-x-12 gap-y-10 border-t border-border pt-10 md:grid-cols-2">
        <Section title="Brand fit">
          <Label>Industries that fit</Label>
          <div className="mt-2"><Chips items={s.brandFitSignals.fit_industries} /></div>
          <div className="mt-5"><Label>Red flags</Label></div>
          <ul className="mt-2 space-y-2">
            {s.brandFitSignals.red_flags.map((flag) => (
              <li key={flag} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{flag}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Adjacent subcultures">
          <Chips items={s.adjacentSubcultures} />
        </Section>
      </div>

      {/* Media */}
      {s.mediaSources.length > 0 && (
        <Section title="Media sources" className="mt-12 border-t border-border pt-10">
          <ul className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {s.mediaSources.map((m) => (
              <li key={m.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{m.name}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{m.type}</span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Shell>
  );
}
