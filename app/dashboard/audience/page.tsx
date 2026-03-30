"use client";

import { useState } from "react";
import { Search, Users, AlertCircle, BarChart2, AtSign, ChevronRight } from "lucide-react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { PlatformBadge } from "@/components/platform-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudience } from "@/hooks/use-audience";
import { formatNumber } from "@/lib/utils";
import { AUDIENCE_PLATFORMS, type AudiencePlatform } from "@/lib/platforms/audience";
import { cn } from "@/lib/utils";

const PLATFORM_LABELS: Record<string, string> = {
  all: "All Platforms",
  reddit: "Reddit",
  twitter: "X / Twitter",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  substack: "Substack",
};

// Platform-specific handle format hints
const PLATFORM_HINTS: Record<string, { placeholder: string; prefix: string; note?: string }> = {
  all:       { placeholder: "handle", prefix: "@", note: "Scrapes Twitter, TikTok, Reddit, and Instagram simultaneously — platforms where the handle isn't found are skipped automatically" },
  twitter:   { placeholder: "twitterhandle", prefix: "@" },
  reddit:    { placeholder: "username", prefix: "u/", note: "Enter your Reddit username without u/" },
  tiktok:    { placeholder: "tiktokhandle", prefix: "@" },
  instagram: { placeholder: "instagramhandle", prefix: "@" },
  facebook:  { placeholder: "profilename", prefix: "", note: "Facebook has no public scraper — returns estimated data" },
  substack:  { placeholder: "substackhandle", prefix: "@", note: "Substack uses estimated data" },
};

export default function AudiencePage() {
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<AudiencePlatform>("all");
  const { mutate, data, isPending, error, isSuccess } = useAudience();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = handle.trim().replace(/^@/, "");
    if (!trimmed) return;
    mutate({ handle: trimmed, platform });
  }

  const topPlatform = data
    ? Object.entries(
        data.communities.reduce<Record<string, number>>((acc, c) => {
          acc[c.platform] = (acc[c.platform] ?? 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audience Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a social handle to discover which communities its audience is most active in.
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5">
          {/* Handle input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {PLATFORM_HINTS[platform]?.prefix
                ? `Handle (${PLATFORM_HINTS[platform].prefix}username)`
                : "Profile name"}
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                {PLATFORM_HINTS[platform]?.prefix ? (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                    {PLATFORM_HINTS[platform].prefix}
                  </span>
                ) : (
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={PLATFORM_HINTS[platform]?.placeholder ?? "handle"}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button type="submit" disabled={isPending || !handle.trim()} className="gap-2">
                <Search className="h-4 w-4" />
                {isPending ? "Analyzing…" : "Analyze Audience"}
              </Button>
            </div>
            {PLATFORM_HINTS[platform]?.note && (
              <p className="text-xs text-muted-foreground">{PLATFORM_HINTS[platform].note}</p>
            )}
          </div>

          {/* Platform selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Platform</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    platform === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                  )}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error.message}
          </div>
        )}

        {/* Loading skeletons */}
        {isPending && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        )}

        {/* Results */}
        {isSuccess && data && !isPending && (
          <div className="space-y-6">
            {/* Live / mock indicator */}
            <div className="flex items-center gap-2">
              {(data as any).live ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live data via Apify
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent border border-border text-muted-foreground text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  {(data as any).fallback ? "Mock data (Apify fallback)" : "Mock data"}
                </span>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Estimated Audience"
                value={formatNumber(data.estimated_total_audience)}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label="Communities Found"
                value={String(data.communities.length)}
                icon={<BarChart2 className="h-4 w-4" />}
              />
              <StatCard
                label="Strongest Platform"
                value={topPlatform ? PLATFORM_LABELS[topPlatform] ?? topPlatform : "—"}
                icon={<AtSign className="h-4 w-4" />}
              />
            </div>

            {/* Community cards */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                Top communities for <span className="text-blue-400">{data.handle}</span>
              </h2>
              {data.communities.map((community) => (
                <AudienceCommunityCard key={community.community_id} community={community} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state before first search */}
        {!isPending && !isSuccess && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground space-y-3">
            <AtSign className="h-10 w-10 opacity-20" />
            <p className="text-sm">Enter a handle above to see where their audience lives.</p>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Audience community card ──────────────────────────────────────────────────

import type { AudienceCommunity } from "@/lib/platforms/audience";

function AudienceCommunityCard({ community }: { community: AudienceCommunity }) {
  const barColor =
    community.overlap_pct >= 40
      ? "bg-blue-500"
      : community.overlap_pct >= 20
      ? "bg-blue-400/70"
      : "bg-blue-400/40";

  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <PlatformBadge platform={community.platform} />
              <span className="text-sm font-semibold text-foreground">{community.community_name}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {community.description}
            </p>
            {/* Shared topics */}
            <div className="flex flex-wrap gap-1.5">
              {community.shared_topics.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px] font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: overlap + size + link */}
          <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-2 shrink-0">
            {/* Overlap % */}
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground">{community.overlap_pct}%</span>
              <p className="text-[11px] text-muted-foreground">audience overlap</p>
              <p className="text-[11px] text-muted-foreground">
                ~{formatNumber(community.estimated_overlap)} followers
              </p>
            </div>

            {/* Overlap bar */}
            <div className="w-24 h-2 rounded-full bg-accent overflow-hidden hidden sm:block">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${Math.min(community.overlap_pct, 100)}%` }}
              />
            </div>

            {/* Community size + view link */}
            <div className="text-right space-y-1">
              <p className="text-[11px] text-muted-foreground">
                {formatNumber(community.community_size)} members
              </p>
              <Link
                href={`/dashboard/community/${encodeURIComponent(community.community_id)}`}
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View community
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
