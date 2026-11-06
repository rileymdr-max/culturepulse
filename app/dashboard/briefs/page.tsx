"use client";

import Link from "next/link";
import { FileText, AlertCircle, Zap, ChevronRight, BookOpen } from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBriefs, type BriefSummary } from "@/hooks/use-briefs";

const URGENCY_BADGE: Record<string, { label: string; cls: string }> = {
  "act-now":    { label: "ACT NOW",    cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  "this-week":  { label: "THIS WEEK",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  "monitor":    { label: "MONITOR",    cls: "bg-muted text-muted-foreground border-border" },
};

function BriefRow({ brief }: { brief: BriefSummary }) {
  const badge = URGENCY_BADGE[brief.urgency] ?? URGENCY_BADGE["monitor"];
  const date = new Date(brief.createdAt).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <Link href={`/dashboard/briefs/${brief.id}`}>
      <Card className="group hover:border-indigo-500/40 hover:shadow-sm transition-all cursor-pointer">
        <CardContent className="px-5 py-4 flex items-center gap-4">
          <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 tracking-wider", badge.cls)}>
            {badge.label}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground group-hover:text-indigo-500 transition-colors truncate">
              {brief.headline}
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span>{brief.subculture.name}</span>
              <span>·</span>
              <span className="px-1.5 py-0.5 rounded bg-muted border border-border">
                {brief.subculture.category}
              </span>
              {brief.velocityAtGeneration !== null && (
                <>
                  <span>·</span>
                  <span className={brief.velocityAtGeneration > 0 ? "text-indigo-500" : "text-muted-foreground"}>
                    {brief.velocityAtGeneration > 0 ? "+" : ""}{brief.velocityAtGeneration}% at generation
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground/60 hidden sm:inline">{date}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function BriefsPage() {
  const { data, isLoading, error } = useBriefs();
  const briefs = data?.briefs ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-500" />
            Content Briefs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
Strategy documents built from subculture intelligence and live signal context.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
            <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load briefs.
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border px-5 py-4 flex items-center gap-4">
                <Skeleton className="h-5 w-20 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-3 w-16 hidden sm:block" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && briefs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No briefs yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1 mb-6">
              Generate a brief from the Signal Board or any subculture profile.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/monitors">
                <Button variant="outline" className="gap-2">
                  <Zap className="h-4 w-4" />Signal Board
                </Button>
              </Link>
              <Link href="/dashboard/subcultures">
                <Button variant="outline" className="gap-2">
                  <BookOpen className="h-4 w-4" />Library
                </Button>
              </Link>
            </div>
          </div>
        )}

        {briefs.length > 0 && (
          <div className="space-y-3">
            {briefs.map((b) => <BriefRow key={b.id} brief={b} />)}
            <p className="text-xs text-muted-foreground text-center pt-2">
              {briefs.length} brief{briefs.length !== 1 ? "s" : ""} generated
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
