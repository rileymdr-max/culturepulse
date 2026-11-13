"use client";

import { useState } from "react";
import { ArrowLeft, Copy, Loader2, Trash2, Check, Megaphone } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BriefView } from "@/components/brief-view";
import { cn } from "@/lib/utils";
import { urgencyOf } from "@/lib/brief-urgency";
import { useBrief, useDeleteBrief } from "@/hooks/use-briefs";

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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</main>
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
          <Skeleton className="mt-8 h-7 w-28 rounded-full" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-2/3" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
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
          <h1 className="text-lg">We couldn’t find that brief</h1>
          <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
        </div>
      </Shell>
    );
  }

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

      <BriefView brief={brief} />

      <div className="mt-16 flex items-center justify-center gap-2 border-t-2 border-foreground pt-6 text-sm text-muted-foreground">
        <Megaphone className="h-4 w-4" aria-hidden />
        End of brief ·{" "}
        <button onClick={handleCopy} className="font-semibold text-foreground underline decoration-2 underline-offset-4 hover:text-primary">
          {copied ? "Copied" : "Copy as text"}
        </button>
      </div>
    </Shell>
  );
}
