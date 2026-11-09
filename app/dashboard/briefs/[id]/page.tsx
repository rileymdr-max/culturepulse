"use client";

import { useState } from "react";
import { ArrowLeft, Copy, AlertCircle, Loader2, Trash2, Check } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { urgencyOf } from "@/lib/brief-urgency";
import { useBrief, useDeleteBrief, type ContentAngle, type PlatformStrategyItem, type BriefBrandFit } from "@/hooks/use-briefs";

const chip = "inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground";
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;

// Layout pieces ──────────────────────────────────────────────────────────────

function Section({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {meta && <p className="text-sm text-muted-foreground tabular-nums">{meta}</p>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ContentAngles({ angles }: { angles: ContentAngle[] }) {
  return (
    <ol className="space-y-8">
      {angles.map((angle, i) => (
        <li key={i} className="flex gap-4">
          <span className="w-6 shrink-0 pt-0.5 text-right text-sm font-medium tabular-nums text-muted-foreground">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-snug">{angle.headline}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{angle.platform}</p>
            <p className="mt-3 leading-relaxed">{angle.description}</p>
            <div className="mt-3 rounded-lg bg-muted px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Example</p>
              <p className="mt-1 text-sm leading-relaxed">{angle.example}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PlatformStrategy({ items }: { items: PlatformStrategyItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.platform}>
          <h3 className="font-semibold">{item.platform}</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">{item.approach}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium">Formats</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {item.formats.map((f) => <span key={f} className={chip}>{f}</span>)}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Tone</dt>
              <dd className="mt-1 text-muted-foreground">{item.tone}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}

function BrandFit({ brandFit }: { brandFit: BriefBrandFit }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
      <div>
        <h3 className="font-semibold">Best fit for</h3>
        <ul className="mt-3 space-y-2">
          {brandFit.ideal_brands.map((b) => (
            <li key={b} className="flex gap-2.5 leading-relaxed text-muted-foreground">
              <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
        <h3 className="mt-6 font-semibold">Timing</h3>
        <p className="mt-2 leading-relaxed text-muted-foreground">{brandFit.engagement_window}</p>
      </div>
      <div>
        <h3 className="font-semibold">Watch out for</h3>
        <ul className="mt-3 space-y-2">
          {brandFit.warning_signals.map((w) => (
            <li key={w} className="flex gap-2.5 leading-relaxed text-muted-foreground">
              <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Copy-as-text ───────────────────────────────────────────────────────────────

function buildPlainText(brief: NonNullable<ReturnType<typeof useBrief>["data"]>["brief"]) {
  const { headline, urgency, momentSummary, accelerationContext, contentAngles, platformStrategy, brandFit, subculture } = brief;
  const lines: string[] = [
    `CONTENT BRIEF — ${headline}`,
    `Urgency: ${urgencyOf(urgency).label} | Subculture: ${subculture.name} | Category: ${subculture.category}`,
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
    `Best fit for: ${brandFit.ideal_brands.join(", ")}`,
    `Watch out for: ${brandFit.warning_signals.join("; ")}`,
    `Timing: ${brandFit.engagement_window}`,
  ];
  return lines.join("\n");
}

// Page ───────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

const backLink = (
  <Link href="/dashboard/briefs" className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />All briefs
  </Link>
);

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
    deleteBrief(id, { onSuccess: () => router.push("/dashboard/briefs") });
  }

  if (isLoading) {
    return (
      <Shell>
        <div aria-hidden>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-8 h-4 w-32" />
          <Skeleton className="mt-3 h-10 w-full" />
          <Skeleton className="mt-2 h-10 w-2/3" />
          <Skeleton className="mt-4 h-4 w-56" />
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !brief) {
    return (
      <Shell>
        {backLink}
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <h1 className="text-lg font-semibold">We couldn’t find that brief</h1>
          <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
        </div>
      </Shell>
    );
  }

  const u = urgencyOf(brief.urgency);
  const date = new Date(brief.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <Shell>
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backLink}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handleCopy} aria-live="polite">
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy as text"}
          </Button>
          <Button
            variant="ghost" size="sm"
            className={cn(confirmDelete ? "text-destructive hover:text-destructive" : "text-muted-foreground")}
            disabled={isDeleting}
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {confirmDelete ? "Click again to delete" : "Delete"}
          </Button>
        </div>
      </div>

      {/* Header */}
      <header className="mt-10">
        <p className="text-sm">
          <span className={cn("font-semibold", u.text)}>{u.label}</span>
          <span className="text-muted-foreground"> · {u.detail}</span>
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{brief.headline}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href={`/dashboard/subcultures/${brief.subculture.slug}`} className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">
            {brief.subculture.name}
          </Link>
          {" · "}{brief.subculture.category}
          {brief.velocityAtGeneration !== null && (
            <span className="tabular-nums"> · {signed(brief.velocityAtGeneration)} velocity when generated</span>
          )}
          {" · "}{date}
        </p>
      </header>

      {/* Moment + why now */}
      <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold">The moment</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">{brief.momentSummary}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Why now</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">{brief.accelerationContext}</p>
        </div>
      </div>

      <div className="mt-12 space-y-12">
        <Section title="Content angles" meta={`${brief.contentAngles.length} angle${brief.contentAngles.length !== 1 ? "s" : ""}`}>
          <ContentAngles angles={brief.contentAngles} />
        </Section>
        <Section title="Platform strategy">
          <PlatformStrategy items={brief.platformStrategy} />
        </Section>
        <Section title="Brand fit">
          <BrandFit brandFit={brief.brandFit} />
        </Section>
      </div>
    </Shell>
  );
}
