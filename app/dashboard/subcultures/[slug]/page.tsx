"use client";

import { useState } from "react";
import { MONITOR_REFRESH_COPY } from "@/lib/monitor-schedule";
import {
  ArrowLeft, ArrowRight, Bell, Check, Loader2, FileText, TrendingUp, TrendingDown, Minus, Lock, Plus,
  Hash, MessageSquareQuote, Footprints, CalendarClock, Users, Star, Swords, Heart, Compass,
  Target, TriangleAlert, Network, Newspaper, Podcast, Youtube, BookOpen, Globe, Radio, Layers, Activity,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { signalTier, TIER_STYLE } from "@/lib/signal-tier";
import { D, EYEBROW, M } from "@/components/marketing/brand";
import { BOX, Section, StatTile, FitList, splitLead } from "@/components/brief-view";
import { PlatformLogos, PlatformLogoRow, platformIcons } from "@/components/platform-logo";
import { useSubculture, usePickSubculture, type LibraryAccessInfo, type SubcultureFull, type SubcultureSummary } from "@/hooks/use-subcultures";
import { useMonitors, useCreateMonitor, type MonitorData } from "@/hooks/use-monitors";
import { useCreateBrief, useBriefs } from "@/hooks/use-briefs";

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Sentiment pill colours for icons and entities. */
const SENTIMENT_PILL: Record<string, string> = {
  revered: "bg-primary text-primary-foreground",
  respected: "bg-accent text-accent-foreground",
  controversial: "bg-[#FFE14D] text-foreground",
  villainized: "bg-destructive text-destructive-foreground",
};

/** Avatar tint per sentiment, so the people grid reads at a glance. */
const SENTIMENT_AVATAR: Record<string, string> = {
  revered: "bg-accent",
  respected: "bg-card",
  controversial: "bg-[#FFF6C2]",
  villainized: "bg-destructive/15",
};

const initials = (name: string) =>
  name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";

function mediaIcon(type: string) {
  const t = type.toLowerCase();
  if (/podcast|audio/.test(t)) return Podcast;
  if (/youtube|video|channel/.test(t)) return Youtube;
  if (/magazine|zine|book|journal/.test(t)) return BookOpen;
  if (/news|publication|outlet|blog|site|newsletter/.test(t)) return Newspaper;
  if (/radio|stream/.test(t)) return Radio;
  return Globe;
}

// Layout pieces ──────────────────────────────────────────────────────────────

/** Card with an icon + mono label heading. */
function Panel({ icon: Icon, label, tone = "bg-card", className, strong = false, children }: {
  icon: React.ElementType; label: string; tone?: string; className?: string;
  /** Larger, bold heading for panels whose body is descriptive copy. */
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(BOX, tone, "p-6", className)}>
      <h3 className={cn(
        "flex items-center text-foreground",
        strong ? cn(M, "gap-2 text-sm font-bold uppercase tracking-[0.06em]") : cn(EYEBROW, "gap-1.5"),
      )}>
        <Icon className={strong ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />{label}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/**
 * Short terms render as chips; phrases (long average length) render as a list.
 * Long lists show the first `limit` items with a Show all toggle.
 */
function Chips({ items, limit = 15, chip = "bg-muted text-foreground", quote = false }: {
  items: string[]; limit?: number; chip?: string; quote?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <p className="text-sm text-muted-foreground">None recorded yet.</p>;

  const avg = items.reduce((n, s) => n + s.length, 0) / items.length;
  const asList = avg > 26;
  const shown = expanded ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;

  return (
    <div>
      {asList ? (
        <ul className="space-y-2 text-sm leading-relaxed">
          {shown.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((item) => (
            <span key={item} className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium", chip)}>
              {quote ? `“${item}”` : item}
            </span>
          ))}
        </div>
      )}
      {items.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm font-semibold text-primary underline decoration-2 underline-offset-4"
        >
          {expanded ? "Show fewer" : `Show all ${items.length}`}
          {!expanded && <span className="sr-only"> ({hidden} more)</span>}
        </button>
      )}
    </div>
  );
}

// Live signal ────────────────────────────────────────────────────────────────

const SIGNAL_PLATFORM_LABEL: Record<string, string> = {
  reddit: "Reddit", twitter: "X", tiktok: "TikTok", youtube: "YouTube", instagram: "Instagram", trends: "Google Trends",
};

function LiveSignal({ monitor }: { monitor: MonitorData }) {
  const { signal } = monitor;
  const hasData = monitor.snapshots.length > 0;

  if (!hasData) {
    return (
      <div className={cn(BOX, "flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-4 text-sm")}>
        <span className="flex items-center gap-2.5 text-muted-foreground">
          <Activity className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
          On your Signal Board. The Breakout Score appears after the first run; {MONITOR_REFRESH_COPY}.
        </span>
        <Link href="/dashboard/monitors" className="group inline-flex items-center gap-1 font-semibold text-primary">
          Open Signal Board
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    );
  }

  const tier = signalTier(signal);
  const style = TIER_STYLE[tier];
  const MomentumIcon = signal.momentum === "rising" ? TrendingUp : signal.momentum === "falling" ? TrendingDown : Minus;
  const perPlatform = Object.entries(signal.platform)
    .map(([p, a]) => ({ label: SIGNAL_PLATFORM_LABEL[p] ?? p, v: a?.velocity ?? null }))
    .filter((x): x is { label: string; v: number } => x.v !== null);

  return (
    <section aria-label="Live signal" className={cn(BOX, "overflow-hidden", tier === "breakout" ? "bg-accent/60" : "bg-card")}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground px-5 py-2.5">
        <p className={cn(EYEBROW, "flex items-center gap-1.5 text-foreground")}>
          <span className={cn("h-2 w-2 rounded-full", style.dot, tier === "breakout" && "animate-pulse")} aria-hidden />Live signal
        </p>
        <Link href="/dashboard/monitors" className="group inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          Signal Board
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-px bg-foreground/15 sm:grid-cols-4">
        <div className="px-5 py-4" style={{ backgroundColor: "hsl(var(--card))" }}>
          <p className={EYEBROW}>Breakout Score</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className={cn(D, "text-4xl leading-none tabular-nums", style.text)}>{signal.breakoutScore}</span>
            <span className={cn("text-sm font-bold", style.text)}>{style.label}</span>
          </p>
        </div>
        <div className="px-5 py-4" style={{ backgroundColor: "hsl(var(--card))" }}>
          <p className={EYEBROW}>Velocity</p>
          <p className={cn("mt-1.5 text-xl font-semibold tabular-nums", signal.velocity > 0 && style.text)}>{signed(signal.velocity)}</p>
        </div>
        <div className="px-5 py-4" style={{ backgroundColor: "hsl(var(--card))" }}>
          <p className={EYEBROW}>Momentum</p>
          <p className={cn("mt-1.5 inline-flex items-center gap-1.5 text-xl font-semibold capitalize", signal.momentum === "falling" && "text-muted-foreground")}>
            <MomentumIcon className="h-5 w-5" aria-hidden />{signal.momentum}
          </p>
        </div>
        <div className="px-5 py-4" style={{ backgroundColor: "hsl(var(--card))" }}>
          <p className={EYEBROW}>By platform</p>
          {perPlatform.length > 0 ? (
            <ul className="mt-1.5 space-y-1 text-sm font-medium tabular-nums">
              {perPlatform.map(({ label, v }) => (
                <li key={label} className="flex items-center gap-1.5">
                  <PlatformLogos platform={label} className="h-3.5 w-3.5" />
                  <span className="sr-only">{label}</span>
                  <span className={v > 0 ? "text-primary" : "text-muted-foreground"}>{signed(v)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-1.5 text-sm text-muted-foreground">—</p>}
        </div>
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

/** Teaser for a profile outside the viewer's plan, with a pick or upgrade action. */
function LockedProfile({ s, access }: { s: SubcultureSummary; access: LibraryAccessInfo }) {
  const { mutate: pick, isPending, error } = usePickSubculture();
  const picksLeft = Math.max(0, access.pickLimit - access.picked);

  return (
    <Shell>
      {backLink}
      <header className="mt-8 max-w-3xl">
        <p className={cn(EYEBROW, "text-primary")}>{s.category}</p>
        <h1 className="mt-2 text-5xl leading-[1.05] tracking-tight sm:text-6xl">{s.name}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{s.description}</p>
      </header>

      <section className={cn(BOX, "mt-10 flex max-w-xl flex-col items-start gap-3 bg-card p-6")}>
        <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-foreground bg-[#FFE14D]">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold">The full profile is locked</h2>
        <p className="text-sm text-muted-foreground">
          Keywords, vernacular, moments, icons, psychographics, brand fit and live signal data.
        </p>
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {picksLeft > 0 ? (
          <Button disabled={isPending} onClick={() => pick({ subcultureId: s.id })}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Unlock with a pick ({picksLeft} left)
          </Button>
        ) : (
          <Link href="/dashboard/billing">
            <Button>
              {access.pickLimit === 0 ? "See plans" : "Get the full library on Pro"} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </section>
    </Shell>
  );
}

const JUMP = [
  { id: "language", label: "Language" },
  { id: "moments", label: "Moments" },
  { id: "icons", label: "Icons" },
  { id: "platforms", label: "Platforms" },
  { id: "mindset", label: "Mindset" },
  { id: "brand-fit", label: "Brand fit" },
  { id: "media", label: "Media" },
];

export default function SubcultureDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useSubculture(slug);
  // Locked profiles (teaser fields only) return early below, before any full field is read.
  const s = data?.subculture as SubcultureFull | undefined;

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
          <Skeleton className="mt-3 h-14 w-80" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-5 w-2/3 max-w-xl" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
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
          <h1 className="text-lg">We couldn’t find that profile</h1>
          <p className="mt-2 text-muted-foreground">It may have been removed from the Library.</p>
        </div>
      </Shell>
    );
  }

  if (data?.locked) return <LockedProfile s={s} access={data.access} />;

  const generate = () => createBrief({ subcultureId: s.id, monitorId: existingMonitor?.id });
  const primaryPlatforms = s.platforms.filter((p) => p.engagement_level === "primary").map((p) => p.platform);
  const [lead, rest] = splitLead(s.description);
  const jump = JUMP.filter((j) => j.id !== "media" || s.mediaSources.length > 0);

  return (
    <Shell>
      {backLink}

      {/* Header */}
      <header className="mt-8 flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn(EYEBROW, "text-primary")}>{s.category}</p>
            {s.status !== "approved" && (
              <span className="rounded-full border-[1.5px] border-foreground bg-[#FFE14D] px-2 py-0.5 text-xs font-bold">Draft</span>
            )}
          </div>
          <h1 className="mt-2 text-5xl leading-[1.05] tracking-tight sm:text-6xl">{s.name}</h1>
          <p className="mt-4 text-xl font-semibold leading-snug">{lead}</p>
          {rest && <p className="mt-2 leading-relaxed text-muted-foreground">{rest}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {existingMonitor ? (
            <Link href="/dashboard/monitors" className="inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-foreground bg-accent px-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/70">
              <Check className="h-4 w-4" aria-hidden />Monitoring
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
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-foreground bg-card px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
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

      {/* At a glance */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          icon={Layers}
          label="Lives on"
          value={primaryPlatforms.length > 0
            ? <span className="flex h-7 items-center"><PlatformLogoRow platforms={primaryPlatforms} className="h-5 w-5" /></span>
            : s.platforms.length}
        />
        <StatTile icon={CalendarClock} label="Moments" value={s.moments.length} />
        <StatTile icon={Users} label="Icons" value={s.icons.length} />
        <StatTile icon={Hash} label="Terms" value={s.keywords.length + s.vernacular.length} />
      </div>

      {existingMonitor && <div className="mt-6"><LiveSignal monitor={existingMonitor} /></div>}

      {/* Jump links */}
      <nav aria-label="Profile sections" className="mt-8 flex flex-wrap gap-2">
        {jump.map((j) => (
          <a key={j.id} href={`#${j.id}`} className="rounded-full border-[1.5px] border-foreground bg-card px-3 py-1 text-sm font-medium transition-colors hover:bg-accent">
            {j.label}
          </a>
        ))}
      </nav>

      <div className="mt-14 space-y-16">
        {/* Language */}
        <Section id="language" n={1} title="Language">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Panel icon={Hash} label="Keywords">
              <Chips items={s.keywords} chip="bg-accent text-accent-foreground" />
            </Panel>
            <Panel icon={MessageSquareQuote} label="Vernacular" tone="bg-[#FFF6C2]">
              <Chips items={s.vernacular} chip="border-[1.5px] border-foreground bg-card text-foreground" quote />
            </Panel>
            <Panel icon={Footprints} label="Behaviors">
              <Chips items={s.categoricalBehaviors} />
            </Panel>
          </div>
        </Section>

        {/* Moments */}
        <Section id="moments" n={2} title="Moments and triggers" meta={`${s.moments.length} moment${s.moments.length !== 1 ? "s" : ""}`}>
          <ol className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {s.moments.map((m, i) => (
              <li key={m.name} className={cn(BOX, "flex gap-4 bg-card p-5", s.moments.length % 2 === 1 && i === s.moments.length - 1 && s.moments.length > 1 && "md:col-span-2")}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-foreground bg-[#EEE8FF]">
                  <CalendarClock className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{m.name}</p>
                  <p className={cn(M, "mt-1 inline-block rounded-md bg-[#FFE14D] px-1.5 py-0.5 text-xs font-medium")}>{m.timing}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Icons */}
        <Section id="icons" n={3} title="Icons and entities" meta={`${s.icons.length} name${s.icons.length !== 1 ? "s" : ""}`}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {s.icons.map((icon) => (
              <li key={icon.name} className={cn(BOX, "flex gap-3 bg-card p-4")}>
                <span className={cn(D, "grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-foreground text-base leading-none", SENTIMENT_AVATAR[icon.sentiment] ?? "bg-muted")} aria-hidden>
                  {initials(icon.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="font-semibold leading-snug">{icon.name}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", SENTIMENT_PILL[icon.sentiment] ?? "bg-muted text-foreground")}>
                      {cap(icon.sentiment)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{icon.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Platforms */}
        <Section id="platforms" n={4} title="Platforms" meta={`${s.platforms.length} platform${s.platforms.length !== 1 ? "s" : ""}`}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {s.platforms.map((p) => {
              const primary = p.engagement_level === "primary";
              return (
                <li key={p.platform} className={cn(BOX, "bg-card p-5", primary && "bg-accent/40")}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-9 shrink-0 place-items-center rounded-full border-[1.5px] border-foreground bg-card px-2">
                        <PlatformLogos platform={p.platform} className="h-4 w-4" />
                      </span>
                      <span className="truncate font-semibold">{p.platform}</span>
                    </span>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                      primary ? "bg-primary text-primary-foreground" : "border-[1.5px] border-foreground bg-card",
                    )}>
                      {cap(p.engagement_level)}
                    </span>
                  </div>
                  {p.content_formats.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {p.content_formats.map((f) => (
                        <span key={f} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{f}</span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        {/* Psychographics */}
        <Section id="mindset" n={5} title="Psychographics">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Panel strong icon={Star} label="Who they look up to" tone="bg-accent/60">
              <p className="leading-relaxed">{s.psychographics.hero}</p>
            </Panel>
            <Panel strong icon={Swords} label="Who they push back against" tone="bg-[#FFF6C2]">
              <p className="leading-relaxed">{s.psychographics.villain}</p>
            </Panel>
            <Panel strong icon={Heart} label="Core values">
              <Chips items={s.psychographics.core_values} chip="bg-[#EEE8FF] text-foreground" />
            </Panel>
            <Panel strong icon={Compass} label="Motivations">
              <Chips items={s.psychographics.motivations} chip="bg-muted text-foreground" />
            </Panel>
          </div>
        </Section>

        {/* Brand fit + adjacent */}
        <Section id="brand-fit" n={6} title="Brand fit">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Panel strong icon={Target} label="Industries that fit" tone="bg-accent/60">
              <Chips items={s.brandFitSignals.fit_industries} chip="border-[1.5px] border-foreground bg-card text-foreground" />
            </Panel>
            <Panel strong icon={TriangleAlert} label="Red flags" tone="bg-[#FFF6C2]">
              {s.brandFitSignals.red_flags.length > 0
                ? <div className="[&>ul]:mt-0"><FitList items={s.brandFitSignals.red_flags} icon={TriangleAlert} iconClass="bg-[#FFE14D] text-foreground" /></div>
                : <p className="text-sm text-muted-foreground">None recorded yet.</p>}
            </Panel>
            <Panel strong icon={Network} label="Adjacent subcultures" tone="bg-[#EEE8FF]" className="md:col-span-2">
              <Chips items={s.adjacentSubcultures} chip="border-[1.5px] border-foreground bg-card text-foreground" />
            </Panel>
          </div>
        </Section>

        {/* Media */}
        {s.mediaSources.length > 0 && (
          <Section id="media" n={7} title="Media sources" meta={`${s.mediaSources.length} source${s.mediaSources.length !== 1 ? "s" : ""}`}>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.mediaSources.map((m) => {
                const Icon = mediaIcon(m.type);
                // "Subreddit", "YouTube channel", "Twitter/X account" → show that platform's logo.
                const typeKey = /subreddit/i.test(m.type) ? "reddit" : m.type;
                const hasLogo = platformIcons(typeKey).length > 0;
                return (
                  <li key={m.name} className={cn(BOX, "bg-card p-5")}>
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px] border-foreground bg-card">
                        {hasLogo ? <PlatformLogos platform={typeKey} className="h-4 w-4" /> : <Icon className="h-4 w-4" aria-hidden />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{m.name}</p>
                        <p className={cn(EYEBROW, "mt-0.5")}>{m.type}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
      </div>
    </Shell>
  );
}
