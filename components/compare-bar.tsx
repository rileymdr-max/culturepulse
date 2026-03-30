"use client";

import { GitCompare, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/platform-badge";
import type { CommunityData } from "@/lib/platforms/types";

interface CompareBarProps {
  communities: CommunityData[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CompareBar({ communities, onRemove, onClear }: CompareBarProps) {
  if (communities.length === 0) return null;

  const compareUrl = `/dashboard/compare?ids=${communities.map((c) => encodeURIComponent(c.community_id)).join(",")}`;

  return (
    <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-card/90 backdrop-blur-md">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        {/* Label */}
        <span className="text-xs text-muted-foreground shrink-0">
          Comparing {communities.length}/4:
        </span>

        {/* Community pills */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {communities.map((c) => (
            <div
              key={c.community_id}
              className="flex items-center gap-1.5 rounded-full bg-accent border border-border px-2.5 py-1 text-xs"
            >
              <PlatformBadge platform={c.platform} showDot className="border-0 bg-transparent p-0 text-[10px]" />
              <span className="text-foreground truncate max-w-[100px]">{c.community_name}</span>
              <button
                onClick={() => onRemove(c.community_id)}
                className="text-muted-foreground hover:text-foreground ml-0.5"
                aria-label={`Remove ${c.community_name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
          <Link href={compareUrl}>
            <Button size="sm" disabled={communities.length < 2} className="gap-1.5">
              <GitCompare className="h-4 w-4" />
              Compare {communities.length >= 2 ? "now" : "(need 2+)"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
