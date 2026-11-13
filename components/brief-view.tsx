import {
  Check, Eye, Zap, Lightbulb, MessageCircle, Target, TriangleAlert, Clock, Activity, Layers, Timer,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { urgencyOf } from "@/lib/brief-urgency";
import { D, EYEBROW, M } from "@/components/marketing/brand";
import { PlatformLogos } from "@/components/platform-logo";
import type { BriefDetail, ContentAngle, PlatformStrategyItem, BriefBrandFit } from "@/hooks/use-briefs";

/* Visual layout for a content brief: urgency sticker, at-a-glance stats,
   story cards, numbered angle cards, platform cards and colour-coded brand fit.
   Every field the AI writes is shown in full — the design only adds structure. */


const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;

/** Ink-outlined card used for every block on the page. */
const BOX = "rounded-2xl border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]";

/** Split off the first sentence so it can lead in bold; the rest stays as-is. Never drops text. */
function splitLead(text: string): [string, string] {
  const m = text.match(/^([\s\S]+?[.!?])\s+([\s\S]+)$/);
  if (!m || m[1].length < 20) return [text, ""];
  return [m[1], m[2]];
}

function PlatformTag({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-foreground bg-card px-2.5 py-0.5 text-xs font-semibold">
      <PlatformLogos platform={platform} className="h-3.5 w-3.5" />
      {platform}
    </span>
  );
}

/** Urgency as a filled sticker: green for act-now, yellow for this week, plain for monitor. */
const URGENCY_STICKER: Record<string, string> = {
  "act-now": "bg-primary text-primary-foreground",
  "this-week": "bg-[#FFE14D] text-foreground",
  monitor: "bg-card text-foreground",
};

/** In a two-column grid, stretch a lone last card across both columns. */
const lastOdd = (i: number, n: number) => n % 2 === 1 && n > 1 && i === n - 1;

// Layout pieces ──────────────────────────────────────────────────────────────

function Section({ id, n, title, meta, children }: { id: string; n: number; title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-3">
        <div>
          <p className={cn(EYEBROW, "text-primary")}>{String(n).padStart(2, "0")}</p>
          <h2 className={cn(D, "mt-1 text-3xl leading-none tracking-wide")}>{title}</h2>
        </div>
        {meta && <p className={cn(M, "text-xs text-muted-foreground tabular-nums")}>{meta}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className={cn(BOX, "bg-card px-4 py-3")}>
      <p className={cn(EYEBROW, "flex items-center gap-1.5")}>
        <Icon className="h-3.5 w-3.5" aria-hidden />{label}
      </p>
      <p className="mt-1.5 text-lg font-semibold leading-tight tabular-nums">{value}</p>
    </div>
  );
}

function StoryCard({ icon: Icon, label, text, tone }: { icon: React.ElementType; label: string; text: string; tone: string }) {
  const [lead, rest] = splitLead(text);
  return (
    <div className={cn(BOX, tone, "p-6")}>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-foreground bg-card">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h2 className={cn(EYEBROW, "text-foreground")}>{label}</h2>
      </div>
      <p className="mt-4 text-lg font-semibold leading-snug">{lead}</p>
      {rest && <p className="mt-2 leading-relaxed text-foreground/80">{rest}</p>}
    </div>
  );
}

function ContentAngles({ angles }: { angles: ContentAngle[] }) {
  return (
    <ol className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {angles.map((angle, i) => (
        <li key={i} className={cn(BOX, "flex flex-col bg-card p-6", lastOdd(i, angles.length) && "md:col-span-2")}>
          <div className="flex items-start justify-between gap-3">
            <span className={cn(D, "grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-foreground bg-accent text-xl leading-none")}>
              {i + 1}
            </span>
            <PlatformTag platform={angle.platform} />
          </div>
          <h3 className="mt-4 text-lg font-semibold leading-snug">{angle.headline}</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">{angle.description}</p>
          <div className="mt-auto pt-5">
            <div className="rounded-xl border-[1.5px] border-dashed border-foreground bg-[#FFF6C2] px-4 py-3">
              <p className={cn(EYEBROW, "flex items-center gap-1.5 text-foreground")}>
                <Lightbulb className="h-3.5 w-3.5" aria-hidden />Example
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">{angle.example}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PlatformStrategy({ items }: { items: PlatformStrategyItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {items.map((item, i) => (
        <div key={item.platform} className={cn(BOX, "flex flex-col overflow-hidden bg-card", lastOdd(i, items.length) && "sm:col-span-2")}>
          <div className="flex items-center gap-2.5 border-b-2 border-foreground bg-muted px-5 py-3">
            <span className="grid h-8 shrink-0 place-items-center rounded-full border-[1.5px] border-foreground bg-card px-2"><PlatformLogos platform={item.platform} className="h-4 w-4" /></span>
            <h3 className="font-semibold">{item.platform}</h3>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <p className="leading-relaxed">{item.approach}</p>
            <div className="mt-5">
              <p className={EYEBROW}>Formats</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.formats.map((f) => (
                  <span key={f} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">{f}</span>
                ))}
              </div>
            </div>
            <div className="mt-auto pt-5">
              <div className="flex gap-2.5 rounded-xl bg-muted px-4 py-3">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <p className={EYEBROW}>Tone</p>
                  <p className="mt-1 text-sm leading-relaxed">{item.tone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FitList({ items, icon: Icon, iconClass }: { items: string[]; icon: React.ElementType; iconClass: string }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5 leading-relaxed">
          <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] border-foreground", iconClass)}>
            <Icon className="h-3 w-3" aria-hidden />
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function BrandFit({ brandFit }: { brandFit: BriefBrandFit }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className={cn(BOX, "bg-accent/60 p-6")}>
        <h3 className={cn(EYEBROW, "flex items-center gap-1.5 text-foreground")}><Target className="h-3.5 w-3.5" aria-hidden />Best fit for</h3>
        <FitList items={brandFit.ideal_brands} icon={Check} iconClass="bg-primary text-primary-foreground" />
      </div>
      <div className={cn(BOX, "bg-[#FFF6C2] p-6")}>
        <h3 className={cn(EYEBROW, "flex items-center gap-1.5 text-foreground")}><TriangleAlert className="h-3.5 w-3.5" aria-hidden />Watch out for</h3>
        <FitList items={brandFit.warning_signals} icon={TriangleAlert} iconClass="bg-[#FFE14D] text-foreground" />
      </div>
      <div className={cn(BOX, "flex gap-4 bg-[#EEE8FF] p-6 md:col-span-2")}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-foreground bg-card">
          <Clock className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h3 className={cn(EYEBROW, "text-foreground")}>Timing</h3>
          <p className="mt-1.5 leading-relaxed">{brandFit.engagement_window}</p>
        </div>
      </div>
    </div>
  );
}

const JUMP = [
  { id: "moment", label: "The moment" },
  { id: "angles", label: "Content angles" },
  { id: "platforms", label: "Platform strategy" },
  { id: "fit", label: "Brand fit" },
];

export function BriefView({ brief }: { brief: BriefDetail }) {
  const u = urgencyOf(brief.urgency);
  const date = new Date(brief.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const nAngles = brief.contentAngles.length;
  const nPlatforms = brief.platformStrategy.length;

  return (
    <>
      {/* Header */}
      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border-2 border-foreground px-3 py-1 text-sm font-bold shadow-[2px_2px_0_hsl(var(--foreground))]",
            URGENCY_STICKER[brief.urgency] ?? URGENCY_STICKER.monitor,
          )}>
            {brief.urgency === "act-now" && <span aria-hidden>🔥</span>}
            {u.label}
          </span>
          <span className={cn(EYEBROW)}>Content brief · {date}</span>
        </div>
        <h1 className="mt-4 text-4xl leading-[1.05] tracking-tight sm:text-6xl">{brief.headline}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href={`/dashboard/subcultures/${brief.subculture.slug}`} className="font-semibold text-foreground underline decoration-2 underline-offset-4 hover:text-primary">
            {brief.subculture.name}
          </Link>
          {" · "}{brief.subculture.category}
        </p>
      </header>

      {/* At a glance */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={Timer} label="Window" value={u.detail} />
        <StatTile
          icon={Activity}
          label="Velocity"
          value={brief.velocityAtGeneration !== null
            ? <span className={brief.velocityAtGeneration > 0 ? "text-primary" : undefined}>{signed(brief.velocityAtGeneration)}</span>
            : "—"}
        />
        <StatTile icon={Lightbulb} label="Angles" value={nAngles} />
        <StatTile icon={Layers} label="Platforms" value={nPlatforms} />
      </div>
      {brief.velocityAtGeneration !== null && (
        <p className="mt-2 text-xs text-muted-foreground">Velocity is as measured when this brief was generated.</p>
      )}

      {/* Jump links */}
      <nav aria-label="Brief sections" className="mt-8 flex flex-wrap gap-2">
        {JUMP.map((j) => (
          <a key={j.id} href={`#${j.id}`} className="rounded-full border-[1.5px] border-foreground bg-card px-3 py-1 text-sm font-medium transition-colors hover:bg-accent">
            {j.label}
          </a>
        ))}
      </nav>

      {/* Moment + why now */}
      <div id="moment" className="mt-10 grid scroll-mt-24 grid-cols-1 gap-6 md:grid-cols-2">
        <StoryCard icon={Eye} label="The moment" text={brief.momentSummary} tone="bg-card" />
        <StoryCard icon={Zap} label="Why now" text={brief.accelerationContext} tone="bg-accent/60" />
      </div>

      <div className="mt-16 space-y-16">
        <Section id="angles" n={1} title="Content angles" meta={`${nAngles} angle${nAngles !== 1 ? "s" : ""}`}>
          <ContentAngles angles={brief.contentAngles} />
        </Section>
        <Section id="platforms" n={2} title="Platform strategy" meta={`${nPlatforms} platform${nPlatforms !== 1 ? "s" : ""}`}>
          <PlatformStrategy items={brief.platformStrategy} />
        </Section>
        <Section id="fit" n={3} title="Brand fit">
          <BrandFit brandFit={brief.brandFit} />
        </Section>
      </div>
    </>
  );
}
