"use client";

import { useState } from "react";
import {
  ArrowLeft, FileText, AlertCircle, Loader2, Trash2,
  CheckCircle, AlertTriangle, Clock, Lightbulb, Target, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBrief, useDeleteBrief, type ContentAngle, type PlatformStrategyItem, type BriefBrandFit } from "@/hooks/use-briefs";

// ─── Urgency config ───────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  "act-now":   { label: "ACT NOW",   cls: "bg-red-500/15 text-red-400 border-red-500/30",   icon: AlertTriangle, detail: "24–72 hour window" },
  "this-week": { label: "THIS WEEK", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock, detail: "7-day window" },
  "monitor":   { label: "MONITOR",   cls: "bg-muted text-muted-foreground border-border",   icon: TrendingUp, detail: "Building signal" },
};

const PLATFORM_COLORS: Record<string, string> = {
  "TikTok":    "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Instagram": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Twitter":   "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Reddit":    "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "YouTube":   "bg-red-500/10 text-red-400 border-red-500/20",
  "X":         "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

function PlatformBadge({ platform }: { platform: string }) {
  const cls = PLATFORM_COLORS[platform] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0", cls)}>
      {platform}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Content angles ───────────────────────────────────────────────────────────

function ContentAngles({ angles }: { angles: ContentAngle[] }) {
  return (
    <div className="space-y-4">
      {angles.map((angle, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-2 hover:border-indigo-500/30 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground/50 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold text-foreground">{angle.headline}</h3>
            </div>
            <PlatformBadge platform={angle.platform} />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{angle.description}</p>
          <div className="pl-3 border-l-2 border-indigo-500/30 mt-2">
            <p className="text-xs font-medium text-indigo-500 mb-0.5">Example execution</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{angle.example}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Platform strategy ────────────────────────────────────────────────────────

function PlatformStrategy({ items }: { items: PlatformStrategyItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item) => (
        <div key={item.platform} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={item.platform} />
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{item.approach}</p>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Formats</p>
            <div className="flex flex-wrap gap-1">
              {item.formats.map((f) => (
                <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tone</p>
            <p className="text-xs text-muted-foreground italic">{item.tone}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Brand fit ────────────────────────────────────────────────────────────────

function BrandFitSection({ brandFit }: { brandFit: BriefBrandFit }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5" />Ideal for
        </p>
        <div className="flex flex-wrap gap-2">
          {brandFit.ideal_brands.map((b) => (
            <span key={b} className="text-sm px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              {b}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />Warning signals
        </p>
        <ul className="space-y-1.5">
          {brandFit.warning_signals.map((w) => (
            <li key={w} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-red-400/60 mt-0.5 shrink-0">—</span>
              {w}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />Engagement window
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">{brandFit.engagement_window}</p>
      </div>
    </div>
  );
}

// ─── Copy-as-text ─────────────────────────────────────────────────────────────

function buildPlainText(brief: NonNullable<ReturnType<typeof useBrief>["data"]>["brief"]) {
  const { headline, urgency, momentSummary, accelerationContext, contentAngles, platformStrategy, brandFit, subculture } = brief;
  const lines: string[] = [
    `CONTENT BRIEF — ${headline}`,
    `Urgency: ${urgency.toUpperCase()} | Subculture: ${subculture.name} | Category: ${subculture.category}`,
    "",
    "THE MOMENT",
    momentSummary,
    "",
    "WHY NOW",
    accelerationContext,
    "",
    "CONTENT ANGLES",
    ...contentAngles.flatMap((a, i) => [
      `${i + 1}. ${a.headline} [${a.platform}]`,
      a.description,
      `   Example: ${a.example}`,
      "",
    ]),
    "PLATFORM STRATEGY",
    ...platformStrategy.flatMap((p) => [
      `${p.platform}: ${p.approach}`,
      `Formats: ${p.formats.join(", ")}`,
      `Tone: ${p.tone}`,
      "",
    ]),
    "BRAND FIT",
    `Ideal for: ${brandFit.ideal_brands.join(", ")}`,
    `Warning: ${brandFit.warning_signals.join("; ")}`,
    `Window: ${brandFit.engagement_window}`,
  ];
  return lines.join("\n");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BriefDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useBrief(id);
  const { mutate: deleteBrief, isPending: isDeleting } = useDeleteBrief();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const brief = data?.brief;

  async function handleCopy() {
    if (!brief) return;
    await navigator.clipboard.writeText(buildPlainText(brief));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteBrief(id, {
      onSuccess: () => router.push("/dashboard/briefs"),
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavHeader />
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </main>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavHeader />
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2 text-red-400 mb-4">
            <AlertCircle className="h-4 w-4" /> Brief not found.
          </div>
          <Link href="/dashboard/briefs">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> All Briefs
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const urgencyConfig = URGENCY_CONFIG[brief.urgency] ?? URGENCY_CONFIG["monitor"];
  const UrgencyIcon = urgencyConfig.icon;
  const date = new Date(brief.createdAt).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

        {/* Back + actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link href="/dashboard/briefs">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> All Briefs
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 text-xs">
              {copied ? <><CheckCircle className="h-3.5 w-3.5 text-green-400" />Copied!</> : <><FileText className="h-3.5 w-3.5" />Copy as text</>}
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn("gap-1.5 text-xs", confirmDelete ? "text-red-400 hover:text-red-300" : "text-muted-foreground")}
              disabled={isDeleting}
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {confirmDelete ? "Confirm?" : "Delete"}
            </Button>
          </div>
        </div>

        {/* Hero header */}
        <div className="border border-border rounded-xl p-6 bg-card space-y-4">
          <div className="flex items-start gap-3 flex-wrap">
            <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border tracking-wider", urgencyConfig.cls)}>
              <UrgencyIcon className="h-3 w-3" />
              {urgencyConfig.label} · {urgencyConfig.detail}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border">
              {brief.subculture.category}
            </span>
            {brief.velocityAtGeneration !== null && (
              <span className={cn(
                "text-xs px-2 py-1 rounded-full border",
                brief.velocityAtGeneration > 0
                  ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                {brief.velocityAtGeneration > 0 ? "+" : ""}{brief.velocityAtGeneration}% velocity at generation
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground leading-tight">{brief.headline}</h1>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              <Link href={`/dashboard/subcultures/${brief.subculture.slug}`} className="text-indigo-500 hover:text-indigo-400 transition-colors font-medium">
                {brief.subculture.name}
              </Link>
            </span>
            <span>·</span>
            <span>{date}</span>
          </div>
        </div>

        {/* The Moment + Why Now */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section icon={FileText} title="The Moment">
            <p className="text-sm text-foreground/80 leading-relaxed">{brief.momentSummary}</p>
          </Section>
          <Section icon={TrendingUp} title="Why Now">
            <p className="text-sm text-foreground/80 leading-relaxed">{brief.accelerationContext}</p>
          </Section>
        </div>

        {/* Content Angles */}
        <Section icon={Lightbulb} title={`Content Angles (${brief.contentAngles.length})`}>
          <ContentAngles angles={brief.contentAngles} />
        </Section>

        {/* Platform Strategy */}
        <Section icon={Target} title="Platform Strategy">
          <PlatformStrategy items={brief.platformStrategy} />
        </Section>

        {/* Brand Fit */}
        <Section icon={CheckCircle} title="Brand Fit">
          <BrandFitSection brandFit={brief.brandFit} />
        </Section>
      </main>
    </div>
  );
}
