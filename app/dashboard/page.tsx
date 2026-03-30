"use client";

import { useState, useCallback } from "react";
import { Bookmark, Zap, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { SearchBar } from "@/components/search-bar";
import { CommunityCard } from "@/components/community-card";
import { CompareBar } from "@/components/compare-bar";
import { SavedPanel } from "@/components/saved-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/platform-badge";
import { useTrending } from "@/hooks/use-trending";
import { useSearch } from "@/hooks/use-search";
import type { CommunityData } from "@/lib/platforms/types";
import type { PlatformStatus } from "@/lib/platforms";

export default function DashboardPage() {
  const [savedOpen, setSavedOpen] = useState(false);
  const [compareList, setCompareList] = useState<CommunityData[]>([]);
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saving" | "saved">("idle");

  const { search, data: searchData, isLoading: isSearching, error: searchError, lastParams, saveSearch } = useSearch();
  const { data: trendingData, isLoading: isTrendingLoading } = useTrending(12);

  const communities = searchData?.communities ?? [];
  const showTrending = !searchData && !isSearching;

  // ── Compare management ──────────────────────────────────────────────────────
  const toggleCompare = useCallback((community: CommunityData) => {
    setCompareList((prev) => {
      const exists = prev.some((c) => c.community_id === community.community_id);
      if (exists) return prev.filter((c) => c.community_id !== community.community_id);
      if (prev.length >= 4) return prev;
      return [...prev, community];
    });
  }, []);

  // ── Save current search ─────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveFeedback("saving");
    await saveSearch();
    setSaveFeedback("saved");
    setTimeout(() => setSaveFeedback("idle"), 2000);
  };

  // ── Restore saved search ────────────────────────────────────────────────────
  const handleSavedSelect = (query: string, platforms: string[]) => {
    search({ query, platforms });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader
        onOpenSaved={() => setSavedOpen(true)}
        compareCount={compareList.length}
      />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 pb-24">
        {/* Search section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Discover Micro-Communities
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Search any subculture, niche, or interest across Reddit, X, TikTok, Instagram, Facebook, and Substack.
          </p>
          <SearchBar
            onSearch={(query, platforms) => search({ query, platforms })}
            isLoading={isSearching}
          />
        </div>

        {/* Platform status bar */}
        <PlatformStatusBar statuses={searchData?.platformStatuses} />

        {/* Error state */}
        {searchError && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2 mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {searchError.message}
          </div>
        )}

        {/* Loading skeletons */}
        {isSearching && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">Searching across platforms…</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Search results */}
        {!isSearching && communities.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {communities.length} communities found for
                </span>
                <span className="text-sm font-medium text-foreground">
                  "{searchData?.query}"
                </span>
                {/* Platform source indicators */}
                <div className="flex gap-1">
                  {Object.entries(searchData?.sources ?? {}).map(([platform, live]) => (
                    <PlatformBadge
                      key={platform}
                      platform={platform}
                      showDot={live}
                      className={live ? "" : "opacity-50"}
                    />
                  ))}
                </div>
              </div>

              {/* Save search button */}
              {lastParams && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleSave}
                  disabled={saveFeedback !== "idle"}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {saveFeedback === "saving" ? "Saving…" : saveFeedback === "saved" ? "Saved!" : "Save search"}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {communities.map((community) => (
                <CommunityCard
                  key={community.community_id}
                  community={community}
                  isSelected={compareList.some((c) => c.community_id === community.community_id)}
                  onToggleCompare={toggleCompare}
                  compareDisabled={compareList.length >= 4}
                />
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!isSearching && searchData && communities.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No communities found. Try a different query.</p>
          </div>
        )}

        {/* Trending (shown before any search) */}
        {showTrending && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-foreground">Globally Trending</h2>
              {isTrendingLoading && (
                <span className="text-xs text-muted-foreground">Loading…</span>
              )}
            </div>

            {isTrendingLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-52 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(trendingData?.communities ?? []).map((community) => (
                  <CommunityCard
                    key={community.community_id}
                    community={community}
                    isSelected={compareList.some((c) => c.community_id === community.community_id)}
                    onToggleCompare={toggleCompare}
                    compareDisabled={compareList.length >= 4}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Compare floating bar */}
      <CompareBar
        communities={compareList}
        onRemove={(id) => setCompareList((prev) => prev.filter((c) => c.community_id !== id))}
        onClear={() => setCompareList([])}
      />

      {/* Saved searches panel */}
      <SavedPanel
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        onSearchSelect={handleSavedSelect}
      />
    </div>
  );
}

// ─── Platform Status Bar ──────────────────────────────────────────────────────

function PlatformStatusBar({ statuses }: { statuses?: PlatformStatus[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!statuses) return null;

  const live = statuses.filter((s) => s.live);
  const pending = statuses.filter((s) => !s.live);

  return (
    <div className="mb-6 rounded-lg border border-border bg-card px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-muted-foreground text-xs font-medium">Data sources:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {live.map((s) => (
              <span key={s.platform} className="inline-flex items-center gap-1 text-xs text-green-400 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                {s.label}
              </span>
            ))}
            {pending.map((s) => (
              <span key={s.platform} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {expanded ? "Hide details" : `${pending.length} pending`}
        </button>
      </div>

      {expanded && pending.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          {pending.map((s) => (
            <div key={s.platform} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="text-muted-foreground/60">{s.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
