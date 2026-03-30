"use client";

import { Users, TrendingUp, Plus, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/platform-badge";
import { formatNumber } from "@/lib/utils";
import type { CommunityData } from "@/lib/platforms/types";

interface CommunityCardProps {
  community: CommunityData;
  isSelected?: boolean;
  onToggleCompare?: (community: CommunityData) => void;
  compareDisabled?: boolean; // true when 4 communities already selected
}

export function CommunityCard({
  community,
  isSelected = false,
  onToggleCompare,
  compareDisabled = false,
}: CommunityCardProps) {
  const topTopics = community.trending_topics.slice(0, 3);
  const encodedId = encodeURIComponent(community.community_id);

  return (
    <Card className="flex flex-col hover:border-blue-800/60 transition-colors">
      <CardContent className="flex flex-col gap-3 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <PlatformBadge platform={community.platform} className="mb-2" />
            <h3 className="font-semibold text-foreground truncate text-sm leading-tight">
              {community.community_name}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-xs shrink-0 mt-0.5">
            <Users className="h-3.5 w-3.5" />
            <span>{formatNumber(community.community_size)}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {community.description}
        </p>

        {/* Trending topics */}
        {topTopics.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Trending
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topTopics.map((t) => (
                <span
                  key={t.topic}
                  className="text-xs rounded-full bg-accent px-2 py-0.5 text-muted-foreground"
                >
                  {t.topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <Link href={`/dashboard/community/${encodedId}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              View
            </Button>
          </Link>
          {onToggleCompare && (
            <Button
              size="sm"
              variant={isSelected ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => onToggleCompare(community)}
              disabled={!isSelected && compareDisabled}
              title={compareDisabled && !isSelected ? "Maximum 4 communities" : undefined}
            >
              {isSelected ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Compare
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
