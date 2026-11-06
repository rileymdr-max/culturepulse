"use client";

import { useState } from "react";
import { Plus, Loader2, BookOpen, Sparkles, AlertCircle, ChevronRight, Hash, Layers } from "lucide-react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSubcultures, useGenerateSubculture, type SubcultureSummary } from "@/hooks/use-subcultures";

const CATEGORIES = ["All", "Fashion", "Gaming", "Music", "Sports", "Food & Drink", "Tech", "Beauty & Wellness", "Lifestyle", "Entertainment", "Outdoors", "Finance", "Automotive", "Arts & Creativity"];

const CATEGORY_COLORS: Record<string, string> = {
  Fashion: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Gaming: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Music: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  Sports: "bg-green-500/10 text-green-400 border-green-500/20",
  "Food & Drink": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Tech: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Beauty & Wellness": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Lifestyle: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Entertainment: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Outdoors: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Finance: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Automotive: "bg-red-500/10 text-red-400 border-red-500/20",
  "Arts & Creativity": "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  "Politics & Activism": "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

function SubcultureCard({ s }: { s: SubcultureSummary }) {
  return (
    <Link href={`/dashboard/subcultures/${s.slug}`}>
      <Card className="group h-full hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/5 transition-all cursor-pointer">
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", CATEGORY_COLORS[s.category] ?? "bg-muted text-muted-foreground border-border")}>
              {s.category}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={cn("text-xs px-1.5 py-0.5 rounded", s.status === "approved" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400")}>
                {s.status}
              </span>
            </div>
          </div>

          {/* Name + description */}
          <div className="flex-1">
            <h3 className="font-semibold text-foreground group-hover:text-indigo-500 transition-colors">
              {s.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {s.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                keywords
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                10 fields
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function GenerateDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [seed, setSeed] = useState("");
  const { mutate, isPending, error, data } = useGenerateSubculture();

  function handleGenerate() {
    if (!name.trim()) return;
    mutate({ name: name.trim(), seed: seed.trim() || undefined });
  }

  if (data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-400">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">Profile Generated</span>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{data.subculture.name}</strong> has been added to the library.
            </p>
            <div className="flex gap-2">
              <Link href={`/dashboard/subcultures/${data.subculture.slug}`} className="flex-1">
                <Button className="w-full" size="sm">View Profile</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <span className="font-semibold text-foreground">Generate Subculture Profile</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>✕</Button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Subculture name *
              </label>
              <Input
                placeholder="e.g. Cottagecore, Hot Rodders, BookTok..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isPending && handleGenerate()}
                disabled={isPending}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Context (optional)
              </label>
              <Input
                placeholder="Any specific angle, region, or nuance..."
                value={seed}
                onChange={e => setSeed(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error.message}
            </div>
          )}

          {isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Claude is building the profile — this takes 1–2 minutes...
            </div>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleGenerate}
              disabled={isPending || !name.trim()}
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generate Profile</>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubculturesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [showGenerate, setShowGenerate] = useState(false);

  const { data, isLoading, error } = useSubcultures(activeCategory === "All" ? undefined : activeCategory);
  const subcultures = data?.subcultures ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-indigo-500" />
              Subculture Library
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pre-built intelligence profiles that power your monitors. Each profile has keywords, vernacular, and moments for precise Boolean query construction.
            </p>
          </div>
          <Button onClick={() => setShowGenerate(true)} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Generate New
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                activeCategory === cat
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load subcultures.
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-5 h-44 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded" />
                </div>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
                <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/40">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : subcultures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No profiles yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1 mb-6">
              Generate your first subculture profile to get started.
            </p>
            <Button onClick={() => setShowGenerate(true)} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Profile
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {subcultures.map(s => <SubcultureCard key={s.id} s={s} />)}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {subcultures.length} profile{subcultures.length !== 1 ? "s" : ""} in library
            </p>
          </>
        )}
      </main>

      {showGenerate && <GenerateDialog onClose={() => setShowGenerate(false)} />}
    </div>
  );
}
