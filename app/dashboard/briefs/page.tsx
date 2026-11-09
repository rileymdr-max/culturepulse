"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBriefs, type BriefSummary } from "@/hooks/use-briefs";
import { urgencyOf } from "@/lib/brief-urgency";

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}%`;

function BriefRow({ brief }: { brief: BriefSummary }) {
  const u = urgencyOf(brief.urgency);
  const date = new Date(brief.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <li>
      <Link href={`/dashboard/briefs/${brief.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug transition-colors group-hover:text-primary sm:truncate">{brief.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className={cn("font-medium", u.text)}>{u.label}</span>
            {" · "}{brief.subculture.name}
            {brief.velocityAtGeneration !== null && (
              <span className="tabular-nums"> · {signed(brief.velocityAtGeneration)} velocity</span>
            )}
          </p>
        </div>
        <span className="hidden shrink-0 text-sm text-muted-foreground tabular-nums sm:block">{date}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
      </Link>
    </li>
  );
}

export default function BriefsPage() {
  const { data, isLoading, error, refetch } = useBriefs();
  const briefs = data?.briefs ?? [];
  const n = briefs.length;
  const actNow = briefs.filter((b) => b.urgency === "act-now").length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Briefs</h1>
          <div className="mt-2 text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-5 w-64" />
            ) : n === 0 ? (
              "Strategy briefs built from a subculture’s profile and its live signals."
            ) : (
              <>
                <span className="tabular-nums">{n}</span> brief{n !== 1 && "s"}
                {actNow > 0 && (
                  <>, <span className="font-medium text-signal tabular-nums">{actNow} to act on now</span></>
                )}
                .
              </>
            )}
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-8 flex items-center gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Couldn’t load your briefs.
            <button onClick={() => refetch()} className="font-medium underline-offset-4 hover:underline">Try again</button>
          </div>
        )}

        {isLoading && (
          <div aria-hidden className="mt-8 divide-y divide-border rounded-xl border border-border bg-card">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 px-5 py-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && n === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <h2 className="text-lg font-semibold">No briefs yet</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Choose Generate brief on any Signal Board card or Audience Audit result.
            </p>
            <Link
              href="/dashboard/monitors"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open the Signal Board
            </Link>
          </div>
        )}

        {n > 0 && (
          <ol className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {briefs.map((b) => <BriefRow key={b.id} brief={b} />)}
          </ol>
        )}
      </main>
    </div>
  );
}
