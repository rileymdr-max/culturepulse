"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, AlertCircle, GitCompare } from "lucide-react";
import Link from "next/link";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { NavHeader } from "@/components/nav-header";
import { PlatformBadge } from "@/components/platform-badge";
import { TrendingTopicsList } from "@/components/trending-topics-list";
import { TrendingContentGrid } from "@/components/trending-content-grid";
import { TopVoicesList } from "@/components/top-voices-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPlatformColor } from "@/components/platform-badge";
import { useCompare } from "@/hooks/use-compare";
import { formatNumber } from "@/lib/utils";
import type { CommunityData } from "@/lib/platforms/types";

// ─── Similarity score badge ───────────────────────────────────────────────────

function SimilarityScore({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-emerald-400 border-emerald-800 bg-emerald-950/30" :
    score >= 40 ? "text-yellow-400 border-yellow-800 bg-yellow-950/30" :
                  "text-red-400 border-red-800 bg-red-950/30";

  return (
    <div className={`inline-flex flex-col items-center rounded-xl border px-4 py-2 ${color}`}>
      <span className="text-2xl font-bold">{score}</span>
      <span className="text-xs opacity-75">/ 100 similarity</span>
    </div>
  );
}

// ─── Radar chart for category comparison ─────────────────────────────────────

function CategoryRadar({ communities }: { communities: CommunityData[] }) {
  // Build a unified set of category labels
  const allLabels = new Set<string>();
  communities.forEach((c) =>
    c.conversation_categories.forEach((cat) => allLabels.add(cat.label))
  );

  const data = [...allLabels].slice(0, 8).map((label) => {
    const entry: Record<string, string | number> = { label };
    communities.forEach((c) => {
      const cat = c.conversation_categories.find((ct) => ct.label === label);
      entry[c.community_name] = cat ? Math.round((cat.volume / 50000) * 100) : 0;
    });
    return entry;
  });

  const colors = communities.map((c) => getPlatformColor(c.platform));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(216 34% 17%)" />
        <PolarAngleAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(224 71% 4%)",
            border: "1px solid hsl(216 34% 17%)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e2e8f0",
          }}
        />
        {communities.map((c, i) => (
          <Radar
            key={c.community_id}
            name={c.community_name}
            dataKey={c.community_name}
            stroke={colors[i]}
            fill={colors[i]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Single compare column ────────────────────────────────────────────────────

function CompareColumn({ community }: { community: CommunityData }) {
  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Hero */}
      <div className="rounded-xl border border-border bg-card p-4">
        <PlatformBadge platform={community.platform} className="mb-2" />
        <h2 className="font-bold text-foreground text-base truncate leading-snug">
          {community.community_name}
        </h2>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
          {community.description}
        </p>
        <p className="mt-3 text-2xl font-bold text-foreground">
          {formatNumber(community.community_size)}
        </p>
        <p className="text-xs text-muted-foreground">members / views</p>
      </div>

      {/* Trending topics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendingTopicsList topics={community.trending_topics.slice(0, 5)} />
        </CardContent>
      </Card>

      {/* Top content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
            Top Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendingContentGrid content={community.trending_content.slice(0, 2)} />
        </CardContent>
      </Card>

      {/* Top voices */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
            Top Voices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TopVoicesList voices={community.top_voices.slice(0, 3)} />
        </CardContent>
      </Card>

      <Link
        href={`/dashboard/community/${encodeURIComponent(community.community_id)}`}
        className="text-xs text-blue-400 hover:text-blue-300 text-center transition-colors"
      >
        View full profile →
      </Link>
    </div>
  );
}

// ─── Main compare page ────────────────────────────────────────────────────────

function ComparePageInner() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") ?? "";
  const communityIds = idsParam
    .split(",")
    .map((id) => decodeURIComponent(id.trim()))
    .filter(Boolean);

  const { data, isLoading, error } = useCompare(communityIds);
  const communities = (data?.communities ?? []).filter((c): c is CommunityData => c !== null);
  const pairLabels = data?.pairLabels ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader compareCount={communityIds.length} />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-blue-400" />
            <h1 className="text-xl font-bold text-foreground">
              Comparing {communities.length} Communities
            </h1>
          </div>
        </div>

        {/* No IDs */}
        {communityIds.length < 2 && !isLoading && (
          <div className="text-center py-20">
            <GitCompare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Select at least 2 communities from the search page to compare.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm">
              Go to search →
            </Link>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2 mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error.message}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${communityIds.length}, minmax(0, 1fr))` }}>
            {communityIds.map((_, i) => (
              <Skeleton key={i} className="h-[600px] rounded-xl" />
            ))}
          </div>
        )}

        {/* Similarity scores summary */}
        {pairLabels.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-muted-foreground mb-3">Similarity Scores</p>
            <div className="flex flex-wrap gap-4">
              {pairLabels.map((pair, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2">
                  <span className="text-sm text-foreground truncate max-w-[100px]">{pair.a}</span>
                  <SimilarityScore score={pair.score} />
                  <span className="text-sm text-foreground truncate max-w-[100px]">{pair.b}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Radar chart */}
        {communities.length >= 2 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Conversation Category Overlap</CardTitle>
              <p className="text-xs text-muted-foreground">Normalized volume across all shared categories</p>
            </CardHeader>
            <CardContent>
              <CategoryRadar communities={communities} />
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-2 justify-center">
                {communities.map((c) => (
                  <span key={c.community_id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: getPlatformColor(c.platform) }}
                    />
                    {c.community_name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="mb-6" />

        {/* Side-by-side columns */}
        {communities.length > 0 && (
          <div
            className="grid gap-4 items-start"
            style={{ gridTemplateColumns: `repeat(${communities.length}, minmax(0, 1fr))` }}
          >
            {communities.map((community) => (
              <CompareColumn key={community.community_id} community={community} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ComparePageInner />
    </Suspense>
  );
}
