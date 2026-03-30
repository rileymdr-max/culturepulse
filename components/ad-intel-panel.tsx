"use client";

import { useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"meta" | "tiktok">("meta");

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Scanning Meta & TikTok Ad Libraries…
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

  const metaAds = data.meta ?? [];
  const tiktokAds = data.tiktok ?? [];
  const activeAds = activeTab === "meta" ? metaAds : tiktokAds;

  return (
    <div className="space-y-4">
      {/* Platform tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <TabButton
          label={`Meta / Instagram${metaAds.length ? ` · ${metaAds.length}` : ""}`}
          active={activeTab === "meta"}
          onClick={() => setActiveTab("meta")}
        />
        <TabButton
          label={`TikTok${tiktokAds.length ? ` · ${tiktokAds.length}` : ""}`}
          active={activeTab === "tiktok"}
          onClick={() => setActiveTab("tiktok")}
        />
      </div>

      {activeAds.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No {activeTab === "meta" ? "Meta" : "TikTok"} ads found for this topic.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {activeAds.length} ads targeting "{query}" · sourced from the public{" "}
            {activeTab === "meta" ? "Meta Ad Library" : "TikTok Ad Library"}.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeAds.map((ad, i) => (
              <AdCard key={i} ad={ad} platform={activeTab} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function AdCard({ ad, platform }: { ad: AdIntelItem; platform: "meta" | "tiktok" }) {
  const accentColor = platform === "tiktok" ? "text-pink-400" : "text-blue-400";
  const accentBg = platform === "tiktok" ? "bg-pink-400/10" : "bg-blue-400/10";

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
          <Megaphone className={`h-3.5 w-3.5 shrink-0 ${accentColor}`} />
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
          <span className={`text-[10px] font-medium ${accentColor} ${accentBg} rounded px-1.5 py-0.5`}>
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
            Since{" "}
            {new Date(ad.startDate).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>
    </a>
  );
}
