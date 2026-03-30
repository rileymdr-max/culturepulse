"use client";

import { useEffect } from "react";
import { ArrowLeft, Users, AlertCircle, Clock, BookmarkPlus, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { PlatformBadge } from "@/components/platform-badge";
import { PulseIndicator } from "@/components/pulse-indicator";
import { CategoryChart } from "@/components/category-chart";
import { TrendingTopicsList } from "@/components/trending-topics-list";
import { TrendingContentGrid } from "@/components/trending-content-grid";
import { TopVoicesList } from "@/components/top-voices-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommunity } from "@/hooks/use-community";
import { useTracked, useTrackCommunity, useUntrackCommunity, useCaptureSnapshot } from "@/hooks/use-tracked";
import { SpikePanel } from "@/components/spike-panel";
import { AdIntelPanel } from "@/components/ad-intel-panel";
import { formatNumber } from "@/lib/utils";

interface PageProps {
  params: { id: string };
}

export default function CommunityDetailPage({ params }: PageProps) {
  const communityId = decodeURIComponent(params.id);

  const { data, isLoading, isFetching, error, refetch } = useCommunity(communityId);
  const community = data?.community;

  const { data: trackedData } = useTracked();
  const trackedEntry = trackedData?.tracked.find((t) => t.communityId === communityId);
  const isTracked = !!trackedEntry;

  const { mutate: track, isPending: isTracking } = useTrackCommunity();
  const { mutate: untrack, isPending: isUntracking } = useUntrackCommunity();
  const { mutate: captureSnapshot, isPending: isCapturing } = useCaptureSnapshot();

  function handleCheckSpikes() {
    if (!community || !trackedEntry) return;
    captureSnapshot({
      trackedId: trackedEntry.id,
      communitySize: community.community_size,
      topTopics: community.trending_topics.slice(0, 5).map((t) => t.topic),
      topCategories: community.conversation_categories.slice(0, 6).map((c) => ({
        label: c.label,
        volume: c.volume,
      })),
      force: true,
    });
  }

  // Auto-capture a snapshot when community data loads and it's tracked
  useEffect(() => {
    if (!community || !trackedEntry) return;
    captureSnapshot({
      trackedId: trackedEntry.id,
      communitySize: community.community_size,
      topTopics: community.trending_topics.slice(0, 5).map((t) => t.topic),
      topCategories: community.conversation_categories.slice(0, 6).map((c) => ({
        label: c.label,
        volume: c.volume,
      })),
    });
  }, [community?.community_id, trackedEntry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error.message}
          </div>
        )}

        {/* Loading */}
        {isLoading && <CommunityDetailSkeleton />}

        {/* Content */}
        {community && (
          <div className="space-y-6">
            {/* Hero */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <PlatformBadge platform={community.platform} className="mb-3" />
                  <h1 className="text-2xl font-bold text-foreground truncate">
                    {community.community_name}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
                    {community.description}
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2 text-foreground">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {formatNumber(community.community_size)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">members / views</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    Auto-refreshes every 60s
                  </span>
                  <PulseIndicator
                    lastUpdated={community.last_updated}
                    isRefetching={isFetching && !isLoading}
                    onRefresh={() => refetch()}
                  />
                  {/* Track / untrack button */}
                  {isTracked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-green-400 border-green-400/30 hover:text-red-400 hover:border-red-400/30"
                      onClick={() => untrack(trackedEntry!.id)}
                      disabled={isUntracking}
                    >
                      <BookmarkCheck className="h-3.5 w-3.5" />
                      Tracking
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() =>
                        track({
                          communityId: community.community_id,
                          communityName: community.community_name,
                          platform: community.platform,
                        })
                      }
                      disabled={isTracking}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                      Track community
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Two-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversation categories */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Conversation Categories</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Green = growing · Red = declining · Blue = stable
                  </p>
                </CardHeader>
                <CardContent>
                  <CategoryChart categories={community.conversation_categories} />
                </CardContent>
              </Card>

              {/* Trending topics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Trending Topics</CardTitle>
                  <p className="text-xs text-muted-foreground">Ranked by volume · Velocity = % change</p>
                </CardHeader>
                <CardContent>
                  <TrendingTopicsList topics={community.trending_topics} />
                </CardContent>
              </Card>
            </div>

            {/* Trending content */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Trending Content</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendingContentGrid content={community.trending_content} />
              </CardContent>
            </Card>

            {/* Top voices */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Voices & Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <TopVoicesList voices={community.top_voices} />
              </CardContent>
            </Card>

            {/* Ad Intelligence — Meta Ad Library for this topic */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ad Intelligence</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Brands running Meta ads targeting this audience · via Meta Ad Library
                </p>
              </CardHeader>
              <CardContent>
                <AdIntelPanel query={community.community_name.replace(/^[#r\/]+/, "")} />
              </CardContent>
            </Card>

            {/* Spike detection — only shown for tracked communities */}
            {isTracked && trackedEntry && (
              <Card>
                <CardContent className="pt-5">
                  <SpikePanel
                    snapshots={trackedEntry.snapshots}
                    platform={community.platform}
                    communityId={community.community_id}
                    isChecking={isCapturing}
                    onCheck={handleCheckSpikes}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CommunityDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
