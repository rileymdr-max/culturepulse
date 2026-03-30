"use client";

import { useState } from "react";
import { Zap, TrendingUp, Star, Users, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { detectSpikes, getContentUrl, TYPE_LABELS, type Spike, type SpikeType } from "@/lib/spike-detection";
import { useSpikeContent, type SpikeContentItem } from "@/hooks/use-spike-content";
import { formatNumber } from "@/lib/utils";
import type { CommunitySnapshot } from "@/hooks/use-tracked";

interface SpikePanelProps {
  snapshots: CommunitySnapshot[];
  platform: string;
  communityId: string;
  isChecking?: boolean;
  onCheck: () => void;
  compact?: boolean;
}

const TYPE_ICONS: Record<SpikeType, React.ReactNode> = {
  new_topic:      <Star className="h-3 w-3" />,
  rising_topic:   <TrendingUp className="h-3 w-3" />,
  category_surge: <Zap className="h-3 w-3" />,
  size_surge:     <Users className="h-3 w-3" />,
};

// ─── Inline content loader per spike ─────────────────────────────────────────

function SpikeContentLoader({
  platform, communityId, topic,
}: { platform: string; communityId: string; topic: string }) {
  const [open, setOpen] = useState(false);
  const { mutate, data, isPending } = useSpikeContent();

  function handleLoad() {
    setOpen(true);
    mutate({ platform, communityId, topic });
  }

  const items: SpikeContentItem[] = data?.items ?? [];

  return (
    <div className="mt-2 ml-1">
      {!open ? (
        <button
          onClick={handleLoad}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          <ChevronDown className="h-3 w-3" />
          Load posts driving this spike
        </button>
      ) : (
        <div className="space-y-1.5">
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
            Hide
          </button>

          {isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Fetching content…
            </div>
          )}

          {!isPending && items.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No inline content available.{" "}
              <a
                href={getContentUrl(platform, communityId, topic)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Search on platform →
              </a>
            </p>
          )}

          {items.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-border bg-accent/40 hover:bg-accent px-3 py-2 transition-colors group"
            >
              <p className="text-xs text-foreground leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground capitalize">{item.type}</span>
                {item.engagement > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    · {formatNumber(item.engagement)} engagements
                  </span>
                )}
                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground ml-auto" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single spike item ────────────────────────────────────────────────────────

function SpikeItem({
  spike, platform, communityId, compact,
}: {
  spike: Spike;
  platform: string;
  communityId: string;
  compact?: boolean;
}) {
  const contentUrl = getContentUrl(platform, communityId, spike.label);
  const canLoadContent = ["twitter", "reddit", "tiktok", "instagram"].includes(platform)
    && spike.type !== "size_surge";

  return (
    <div className="py-2.5 space-y-1">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0",
            spike.severity === "high"
              ? "bg-red-500/15 text-red-400 border border-red-500/30"
              : "bg-orange-500/15 text-orange-400 border border-orange-500/30"
          )}
        >
          {TYPE_ICONS[spike.type]}
          {TYPE_LABELS[spike.type]}
        </span>

        <span className="text-sm text-foreground font-medium">{spike.label}</span>

        <span className="text-xs text-muted-foreground">{spike.changeLabel}</span>

        {/* Deep link to platform */}
        {spike.type !== "size_surge" && (
          <a
            href={contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
          >
            View on platform
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Inline Apify content loader (not shown in compact mode) */}
      {!compact && canLoadContent && (
        <SpikeContentLoader
          platform={platform}
          communityId={communityId}
          topic={spike.label}
        />
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function SpikePanel({
  snapshots, platform, communityId, isChecking, onCheck, compact,
}: SpikePanelProps) {
  const hasEnough = snapshots.length >= 2;
  const spikes = hasEnough ? detectSpikes(snapshots) : [];
  const highCount = spikes.filter((s) => s.severity === "high").length;
  const visibleSpikes = compact ? spikes.slice(0, 4) : spikes;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-semibold text-foreground">Spike Detection</span>
          {spikes.length > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                highCount > 0
                  ? "bg-red-500/20 text-red-400"
                  : "bg-orange-500/20 text-orange-400"
              )}
            >
              {spikes.length} spike{spikes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={onCheck}
          disabled={isChecking}
        >
          <RefreshCw className={cn("h-3 w-3", isChecking && "animate-spin")} />
          {isChecking ? "Checking…" : "Check for spikes"}
        </Button>
      </div>

      {/* Content */}
      {!hasEnough ? (
        <p className="text-xs text-muted-foreground italic">
          Need at least 2 snapshots to detect spikes. Click "Check for spikes" after tracking for a bit.
        </p>
      ) : spikes.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-green-500/60" />
          No unusual activity detected between the last two snapshots.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visibleSpikes.map((spike, i) => (
            <SpikeItem
              key={i}
              spike={spike}
              platform={platform}
              communityId={communityId}
              compact={compact}
            />
          ))}
          {compact && spikes.length > 4 && (
            <p className="text-xs text-muted-foreground pt-2">
              +{spikes.length - 4} more — open community for full details & post previews
            </p>
          )}
        </div>
      )}
    </div>
  );
}
