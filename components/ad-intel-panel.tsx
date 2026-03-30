"use client";

import { ExternalLink, Megaphone, Loader2, AlertCircle, BadgeCheck } from "lucide-react";
import { useAdIntel } from "@/hooks/use-ad-intel";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdIntelItem } from "@/lib/ad-library";

interface AdIntelPanelProps {
  /** The community name or topic to search ads for */
  query: string;
}

export function AdIntelPanel({ query }: AdIntelPanelProps) {
  const { data, isLoading, error } = useAdIntel(query);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Scanning Meta Ad Library…
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400 py-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error.message}
      </div>
    );
  }

  if (!data?.available) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Ad intelligence requires an Apify API token.{" "}
        {data?.reason && <span className="opacity-60">({data.reason})</span>}
      </p>
    );
  }

  if (!data.ads.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No ads found in the Meta Ad Library for this topic.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.ads.length} ads found targeting "{query}" — sourced from the public Meta Ad Library.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.ads.map((ad, i) => (
          <AdCard key={i} ad={ad} />
        ))}
      </div>
    </div>
  );
}

function AdCard({ ad }: { ad: AdIntelItem }) {
  return (
    <a
      href={ad.adLibraryUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card/60 hover:bg-card p-4 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          <span className="text-xs font-semibold text-foreground truncate">
            {ad.advertiser}
          </span>
          {ad.isActive && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-green-400 font-medium">
              <BadgeCheck className="h-3 w-3" />
              Active
            </span>
          )}
        </div>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
        {ad.title}
      </p>

      {/* Body */}
      {ad.body && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {ad.body}
        </p>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-1">
        {ad.callToAction && (
          <span className="text-[10px] font-medium text-blue-400 bg-blue-400/10 rounded px-1.5 py-0.5">
            {ad.callToAction}
          </span>
        )}
        {ad.impressions && (
          <span className="text-[10px] text-muted-foreground">
            ~{ad.impressions} impressions
          </span>
        )}
        {ad.platforms && ad.platforms.length > 0 && (
          <span className="text-[10px] text-muted-foreground capitalize">
            {ad.platforms.slice(0, 2).join(", ")}
          </span>
        )}
        {ad.startDate && (
          <span className="text-[10px] text-muted-foreground">
            Since {new Date(ad.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
        )}
      </div>
    </a>
  );
}
