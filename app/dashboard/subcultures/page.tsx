"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Loader2, AlertCircle, Check, X, ArrowRight, Lock, Car, UtensilsCrossed, Dumbbell, Mountain, Shirt,
  Music, Gamepad2, Palette, Cpu, Sparkles, Shapes, LayoutGrid, Library, Radio, Tags, Star,
} from "lucide-react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSubcultures, useGenerateSubculture, usePickSubculture, type SubcultureSummary } from "@/hooks/use-subcultures";
import { useCurrentPlan } from "@/hooks/use-billing";
import { getPlan } from "@/lib/plans";
import { EYEBROW } from "@/components/marketing/brand";
import { BOX, StatTile } from "@/components/brief-view";
import { PlatformLogoRow } from "@/components/platform-logo";

/**
 * AI-written categories are free-form ("Food & Beverage / Hobbyist Craft"), so exact-match
 * filters miss most profiles. Map each to one broad bucket by keyword (first match wins).
 */
const BUCKETS: [string, RegExp][] = [
  ["Automotive", /auto|car\b|motor|vehicle/i],
  ["Food & drink", /food|beverage|drink|coffee|beer|wine|culinary|cook/i],
  ["Health & fitness", /health|fitness|wellness|longevity|nutrition/i],
  ["Sports & outdoors", /sport|outdoor|endurance|running|climb|hik|recreation/i],
  ["Fashion & beauty", /fashion|beauty|\bstyle\b|apparel|streetwear/i],
  ["Music & entertainment", /music|fandom|\bfan\b|k-pop|nightlife|entertainment|film|\btv\b/i],
  ["Gaming", /gaming|game|esport/i],
  ["Books & arts", /book|literat|\bart|craft|creativ|design/i],
  ["Tech", /tech|software|ai\b|crypto|gadget|computing/i],
  ["Lifestyle", /lifestyle|aesthetic|travel|home|parent/i],
];
const match = (text: string) => BUCKETS.find(([, re]) => re.test(text))?.[0];
// Match the main part ("Automotive" in "Automotive / Motorsport") before the full text.
const bucketOf = (c: string) => match(c.split(" / ")[0]) ?? match(c) ?? "Other";

/** Icon and tint per bucket, so the grid reads by category at a glance. */
const BUCKET_LOOK: Record<string, { icon: React.ElementType; tint: string }> = {
  "Automotive": { icon: Car, tint: "bg-muted" },
  "Food & drink": { icon: UtensilsCrossed, tint: "bg-[#FFF6C2]" },
  "Health & fitness": { icon: Dumbbell, tint: "bg-accent" },
  "Sports & outdoors": { icon: Mountain, tint: "bg-accent" },
  "Fashion & beauty": { icon: Shirt, tint: "bg-[#EEE8FF]" },
  "Music & entertainment": { icon: Music, tint: "bg-[#EEE8FF]" },
  "Gaming": { icon: Gamepad2, tint: "bg-[#FFF6C2]" },
  "Books & arts": { icon: Palette, tint: "bg-[#FFF6C2]" },
  "Tech": { icon: Cpu, tint: "bg-muted" },
  "Lifestyle": { icon: Sparkles, tint: "bg-accent" },
  "Other": { icon: Shapes, tint: "bg-muted" },
};
const lookOf = (category: string) => BUCKET_LOOK[bucketOf(category)] ?? BUCKET_LOOK.Other;

// Card ───────────────────────────────────────────────────────────────────────

function SubcultureCard({ s, canPick }: { s: SubcultureSummary; canPick: boolean }) {
  const { mutate: pick, isPending, error } = usePickSubculture();
  const { icon: Icon, tint } = lookOf(s.category);

  if (s.locked) {
    return (
      <div className="flex h-full flex-col rounded-2xl border-2 border-dashed border-foreground/40 bg-card/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-dashed border-foreground/40 bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden />Locked
          </span>
        </div>
        <p className={cn(EYEBROW, "mt-4")}>{s.category}</p>
        <h3 className="mt-1 text-lg font-semibold leading-snug">{s.name}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
        {error && <p className="mt-2 text-xs text-destructive">{error.message}</p>}
        <div className="mt-4">
          {canPick ? (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => pick({ subcultureId: s.id })}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add to my picks
            </Button>
          ) : (
            <Link href="/dashboard/billing" className="text-sm font-semibold underline decoration-2 underline-offset-4 hover:text-primary">
              Unlock with a plan
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/dashboard/subcultures/${s.slug}`}
      className={cn(
        BOX,
        "group flex h-full flex-col bg-card p-5 transition-[transform,box-shadow] duration-150",
        "hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_hsl(var(--foreground))]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-foreground", tint)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {s.enrichedByApify && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
              <Radio className="h-3 w-3" aria-hidden />Live data
            </span>
          )}
          {s.status !== "approved" && (
            <span className="rounded-full border-[1.5px] border-foreground bg-[#FFE14D] px-2 py-0.5 text-xs font-bold">Draft</span>
          )}
        </div>
      </div>
      <p className={cn(EYEBROW, "mt-4")}>{s.category}</p>
      <h3 className="mt-1 text-lg font-semibold leading-snug transition-colors group-hover:text-primary">{s.name}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <PlatformLogoRow platforms={s.platformNames ?? []} className="h-4 w-4" max={4} />
        <span className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-foreground bg-card transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div aria-hidden className={cn(BOX, "flex h-60 flex-col gap-3 bg-card p-5")}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

// Generate dialog ────────────────────────────────────────────────────────────

function GenerateDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [seed, setSeed] = useState("");
  const { mutate, isPending, error, data } = useGenerateSubculture();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !isPending) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending, onClose]);

  function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    mutate({ name: name.trim(), seed: seed.trim() || undefined });
  }

  const inputCls =
    "h-10 w-full rounded-lg border-[1.5px] border-foreground bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-title"
        className="w-full max-w-md rounded-2xl border-2 border-foreground bg-card p-6 shadow-[6px_6px_0_hsl(var(--foreground))] animate-in zoom-in-95 duration-150"
      >
        {data ? (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Check className="h-4 w-4" aria-hidden />Profile ready
            </p>
            <h2 id="generate-title" className="mt-2 text-lg font-semibold tracking-tight">
              {data.subculture.name} is in your Library
            </h2>
            <div className="mt-6 flex gap-2">
              <Link
                href={`/dashboard/subcultures/${data.subculture.slug}`}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Open profile
              </Link>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="generate-title" className="text-lg font-semibold tracking-tight">New subculture profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">Claude builds the keywords, vernacular and moments for you.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Name</span>
                <input
                  ref={nameRef}
                  className={cn(inputCls, "mt-1.5")}
                  placeholder="Cottagecore, hot rodders, BookTok…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Context <span className="font-normal text-muted-foreground">(optional)</span></span>
                <input
                  className={cn(inputCls, "mt-1.5")}
                  placeholder="A specific angle, region or nuance"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  disabled={isPending}
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />{error.message}
              </p>
            )}
            {isPending && (
              <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Building the profile. This takes 1–2 minutes.
              </p>
            )}

            <div className="mt-6 flex gap-2">
              <Button type="submit" className="flex-1" disabled={isPending || !name.trim()}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isPending ? "Building…" : "Create profile"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Page ───────────────────────────────────────────────────────────────────────

export default function SubculturesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [showGenerate, setShowGenerate] = useState(false);

  // Load everything once and filter here, so filters always match real profiles.
  const { data, isLoading, error, refetch } = useSubcultures();
  const all = useMemo(() => data?.subcultures ?? [], [data]);
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of all) counts.set(bucketOf(s.category), (counts.get(bucketOf(s.category)) ?? 0) + 1);
    // Biggest buckets first; "Other" always last
    return Array.from(counts.entries()).sort((a, b) =>
      (a[0] === "Other" ? 1 : 0) - (b[0] === "Other" ? 1 : 0) || b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [all]);
  const subcultures = activeCategory === "All" ? all : all.filter((s) => bucketOf(s.category) === activeCategory);
  const n = subcultures.length;
  const access = data?.access;
  const picksLeft = access && !access.full ? Math.max(0, access.pickLimit - access.picked) : 0;
  const canCreate = getPlan(useCurrentPlan()).limits.customSubcultures !== 0;
  const liveCount = all.filter((s) => s.enrichedByApify).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <p className={cn(EYEBROW, "text-primary")}>Subculture library</p>
            <h1 className="mt-1 text-5xl tracking-tight">Library</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Subculture profiles with the keywords, vernacular and moments your monitors listen for.
            </p>
          </div>
          {canCreate ? (
            <Button onClick={() => setShowGenerate(true)}>
              <Plus className="h-4 w-4" />New profile
            </Button>
          ) : (
            <Link href="/dashboard/billing">
              <Button variant="outline">
                <Plus className="h-4 w-4" />New profile · Pro
              </Button>
            </Link>
          )}
        </header>

        {/* At a glance */}
        {!isLoading && all.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile icon={Library} label="Profiles" value={all.length} />
            <StatTile icon={Tags} label="Categories" value={categories.length} />
            <StatTile icon={Radio} label="Live data" value={liveCount} />
            <StatTile
              icon={Star}
              label={access?.full ? "Access" : "Your picks"}
              value={access?.full || !access ? "Full library" : `${access.picked} of ${access.pickLimit}`}
            />
          </div>
        )}

        {access && !access.full && (
          <p role="status" className={cn(BOX, "mt-6 flex items-start gap-3 bg-[#FFF6C2] px-4 py-3 text-sm")}>
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {access.pickLimit === 0 ? (
                <>Full profiles come with every plan, or 3 with a one-time Brand Culture Snapshot. </>
              ) : (
                <>
                  <span className="font-semibold tabular-nums">{access.picked} of {access.pickLimit}</span> library picks used
                  {picksLeft > 0 ? ". Pick the profiles you want in full." : ". You can swap a pick 30 days after adding it. "}
                </>
              )}
              {picksLeft === 0 && (
                <Link href="/dashboard/billing" className="font-semibold underline decoration-2 underline-offset-4">
                  Pro includes the full library
                </Link>
              )}
            </span>
          </p>
        )}

        {/* Category filter — built from the profiles you actually have */}
        {categories.length > 1 && (
          <div role="radiogroup" aria-label="Category" className="mt-8 flex flex-wrap gap-2">
            {[["All", all.length] as const, ...categories].map(([cat, count]) => {
              const Icon = cat === "All" ? LayoutGrid : (BUCKET_LOOK[cat] ?? BUCKET_LOOK.Other).icon;
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-foreground px-3 py-1.5 text-sm font-medium transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    active ? "bg-foreground text-background" : "bg-card hover:bg-accent",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {cat}
                  <span className={cn("tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {!isLoading && !error && n > 0 && (
          <p className="mt-6 text-sm text-muted-foreground tabular-nums">
            {n} profile{n !== 1 && "s"}{activeCategory !== "All" && ` in ${activeCategory.toLowerCase()}`}
          </p>
        )}

        {error && (
          <div role="alert" className="mt-8 flex items-center gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Couldn’t load the Library.
            <button onClick={() => refetch()} className="font-medium underline-offset-4 hover:underline">Try again</button>
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : !error && n === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-foreground/40 px-6 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-foreground bg-accent">
              <Library className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold">
              {activeCategory === "All" ? "No profiles yet" : `No ${activeCategory} profiles yet`}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Create a profile for any subculture and Claude will build it in a minute or two.
            </p>
            <Button className="mt-6" onClick={() => setShowGenerate(true)}>
              <Plus className="h-4 w-4" />New profile
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {subcultures.map((s) => <SubcultureCard key={s.id} s={s} canPick={picksLeft > 0} />)}
          </div>
        )}
      </main>

      {showGenerate && <GenerateDialog onClose={() => setShowGenerate(false)} />}
    </div>
  );
}
