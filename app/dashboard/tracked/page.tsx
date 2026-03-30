"use client";

import { useState } from "react";
import { BookmarkCheck, TrendingUp, Users, AlertCircle, Trash2, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { NavHeader } from "@/components/nav-header";
import { PlatformBadge } from "@/components/platform-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTracked, useUntrackCommunity, useCaptureSnapshot, type TrackedCommunity } from "@/hooks/use-tracked";
import { SpikePanel } from "@/components/spike-panel";
import { formatNumber } from "@/lib/utils";

export default function TrackedPage() {
  const { data, isLoading, error } = useTracked();
  const tracked = data?.tracked ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tracked Communities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Communities you're monitoring. Metrics are snapshotted each time you visit a community's detail page.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load tracked communities.
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        )}

        {!isLoading && tracked.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground space-y-3">
            <BookmarkCheck className="h-10 w-10 opacity-20" />
            <p className="text-sm">No tracked communities yet.</p>
            <p className="text-xs">
              Visit any community and click <strong>Track community</strong> to start monitoring it.
            </p>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="mt-2">Go to Search</Button>
            </Link>
          </div>
        )}

        <div className="space-y-6">
          {tracked.map((t) => (
            <TrackedCard key={t.id} tracked={t} />
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Individual tracked community card ───────────────────────────────────────

function TrackedCard({ tracked }: { tracked: TrackedCommunity }) {
  const { mutate: untrack, isPending } = useUntrackCommunity();
  const { mutate: captureSnapshot, isPending: isChecking } = useCaptureSnapshot();
  const [showAll, setShowAll] = useState(false);

  const snapshots = [...tracked.snapshots].reverse(); // chronological order for chart
  const latest = tracked.snapshots[0]; // most recent (snapshots are desc from API)

  function handleCheckSpikes() {
    if (!latest) return;
    captureSnapshot({
      trackedId: tracked.id,
      communitySize: latest.communitySize,
      topTopics: latest.topTopics,
      topCategories: latest.topCategories,
      force: true,
    });
  }
  const earliest = snapshots[0];

  const sizeDelta =
    snapshots.length >= 2
      ? latest.communitySize - earliest.communitySize
      : null;

  const chartData = snapshots.map((s) => ({
    date: new Date(s.capturedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    size: s.communitySize,
  }));

  const topics = latest?.topTopics ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <PlatformBadge platform={tracked.platform} />
              <CardTitle className="text-base">{tracked.communityName}</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Tracking since {new Date(tracked.createdAt).toLocaleDateString()} ·{" "}
              {tracked.snapshots.length} snapshot{tracked.snapshots.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/dashboard/community/${encodeURIComponent(tracked.communityId)}`}>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-400"
              onClick={() => untrack(tracked.id)}
              disabled={isPending}
              title="Stop tracking"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row */}
        {latest && (
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Latest size
              </p>
              <p className="text-lg font-bold text-foreground">
                {formatNumber(latest.communitySize)}
              </p>
            </div>
            {sizeDelta !== null && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Change
                </p>
                <p
                  className={`text-lg font-bold ${
                    sizeDelta >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {sizeDelta >= 0 ? "+" : ""}
                  {formatNumber(sizeDelta)}
                </p>
              </div>
            )}
            {topics.length > 0 && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Top topics</p>
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px] font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Size history chart */}
        {chartData.length >= 2 ? (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Community size over time</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatNumber(v)}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(v: number) => [formatNumber(v), "Size"]}
                />
                <Line
                  type="monotone"
                  dataKey="size"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#60a5fa" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Visit this community again to start building a history chart.
          </p>
        )}

        {/* Spike detection */}
        <div className="border-t border-border pt-4">
          <SpikePanel
            snapshots={tracked.snapshots}
            platform={tracked.platform}
            communityId={tracked.communityId}
            isChecking={isChecking}
            onCheck={handleCheckSpikes}
            compact
          />
        </div>
      </CardContent>
    </Card>
  );
}
