"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { NavHeader } from "@/components/nav-header";
import { TrendingTopicsList } from "@/components/trending-topics-list";
import { TrendingContentGrid } from "@/components/trending-content-grid";
import { TopVoicesList } from "@/components/top-voices-list";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompare } from "@/hooks/use-compare";
import { useTokenColors } from "@/hooks/use-token-color";
import { formatNumber, cn } from "@/lib/utils";
import type { CommunityData } from "@/lib/platforms/types";

// Series colors come from theme tokens so they read in light and dark mode.
const SERIES_TOKENS = ["--primary", "--signal", "--tier-trending", "--muted-foreground"] as const;

function similarityLabel(score: number) {
  return score >= 70 ? "Very similar" : score >= 40 ? "Some overlap" : "Distinct";
}

// Radar ──────────────────────────────────────────────────────────────────────

function CategoryRadar({ communities, colors }: { communities: CommunityData[]; colors: string[] }) {
  const tokens = useTokenColors(["--border", "--muted-foreground", "--popover", "--foreground"] as const);
  const labels = new Set<string>();
  communities.forEach((c) => c.conversation_categories.forEach((cat) => labels.add(cat.label)));

  const data = Array.from(labels).slice(0, 8).map((label) => {
    const entry: Record<string, string | number> = { label };
    communities.forEach((c) => {
      const cat = c.conversation_categories.find((ct) => ct.label === label);
      entry[c.community_name] = cat ? Math.round((cat.volume / 50000) * 100) : 0;
    });
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke={tokens["--border"]} />
        <PolarAngleAxis dataKey="label" tick={{ fill: tokens["--muted-foreground"], fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: tokens["--popover"],
            border: `1px solid ${tokens["--border"]}`,
            borderRadius: 8,
            fontSize: 12,
            color: tokens["--foreground"],
          }}
        />
        {communities.map((c, i) => (
          <Radar
            key={c.community_id}
            name={c.community_name}
            dataKey={c.community_name}
            stroke={colors[i]}
            fill={colors[i]}
            fillOpacity={0.12}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

// Column ─────────────────────────────────────────────────────────────────────

function ColumnSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CompareColumn({ community, color }: { community: CommunityData; color: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
          {community.platform}
        </p>
        <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">{community.community_name}</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{community.description}</p>
        <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">{formatNumber(community.community_size)}</p>
        <p className="text-sm text-muted-foreground">members or views</p>
      </div>

      <ColumnSection title="Trending topics">
        <TrendingTopicsList topics={community.trending_topics.slice(0, 5)} />
      </ColumnSection>
      <ColumnSection title="Top content">
        <TrendingContentGrid content={community.trending_content.slice(0, 2)} />
      </ColumnSection>
      <ColumnSection title="Top voices">
        <TopVoicesList voices={community.top_voices.slice(0, 3)} />
      </ColumnSection>

      <Link
        href={`/dashboard/community/${encodeURIComponent(community.community_id)}`}
        className="group inline-flex items-center gap-1 text-sm font-medium text-primary"
      >
        Full community profile
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}

// Page ───────────────────────────────────────────────────────────────────────

function ComparePageInner() {
  const searchParams = useSearchParams();
  const communityIds = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => decodeURIComponent(id.trim()))
    .filter(Boolean);

  const { data, isLoading, error } = useCompare(communityIds);
  const communities = (data?.communities ?? []).filter((c): c is CommunityData => c !== null);
  const pairLabels = data?.pairLabels ?? [];
  const tokenColors = useTokenColors(SERIES_TOKENS);
  const colors = communities.map((_, i) => tokenColors[SERIES_TOKENS[i % SERIES_TOKENS.length]]);
  const cols = { gridTemplateColumns: `repeat(${Math.max(communities.length, communityIds.length, 1)}, minmax(0, 1fr))` };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader compareCount={communityIds.length} />

      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/dashboard/search" className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />Search
        </Link>
        <h1 className="mt-4 text-4xl tracking-tight">
          {communities.length >= 2
            ? communities.map((c) => c.community_name).join(" vs ")
            : "Compare communities"}
        </h1>

        {communityIds.length < 2 && !isLoading && (
          <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <h2 className="text-lg font-semibold">Nothing to compare yet</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Comparisons show two to four communities side by side: their size, trending topics, top content and voices.
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-8 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />{error.message}
          </div>
        )}

        {isLoading && (
          <div aria-hidden className="mt-8 grid gap-6" style={cols}>
            {communityIds.map((_, i) => <Skeleton key={i} className="h-[560px] rounded-xl" />)}
          </div>
        )}

        {/* Similarity */}
        {pairLabels.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold">Similarity</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {pairLabels.map((pair, i) => (
                <li key={i} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
                  <span className="max-w-[10rem] truncate text-sm">{pair.a}</span>
                  <span className="text-center">
                    <span className="block text-2xl font-semibold leading-none tracking-tight tabular-nums">{pair.score}</span>
                    <span className={cn("mt-1 block text-xs", pair.score >= 70 ? "text-primary" : "text-muted-foreground")}>
                      {similarityLabel(pair.score)}
                    </span>
                  </span>
                  <span className="max-w-[10rem] truncate text-sm">{pair.b}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Radar */}
        {communities.length >= 2 && (
          <section className="mt-8 rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold tracking-tight">What they talk about</h2>
            <p className="mt-1 text-sm text-muted-foreground">Relative conversation volume across shared categories</p>
            <CategoryRadar communities={communities} colors={colors} />
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              {communities.map((c, i) => (
                <span key={c.community_id} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} aria-hidden />
                  {c.community_name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Columns */}
        {communities.length > 0 && (
          <div className="mt-10 grid items-start gap-6" style={cols}>
            {communities.map((community, i) => (
              <CompareColumn key={community.community_id} community={community} color={colors[i]} />
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
