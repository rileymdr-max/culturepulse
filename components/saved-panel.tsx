"use client";

import { Trash2, Search, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetHeader, SheetTitle, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformBadge } from "@/components/platform-badge";
import { timeAgo } from "@/lib/utils";

interface SavedSearch {
  id: string;
  query: string;
  platforms: string[];
  label: string | null;
  createdAt: string;
}

interface SavedPanelProps {
  open: boolean;
  onClose: () => void;
  onSearchSelect?: (query: string, platforms: string[]) => void;
}

export function SavedPanel({ open, onClose, onSearchSelect }: SavedPanelProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ savedSearches: SavedSearch[] }>({
    queryKey: ["saved"],
    queryFn: () => fetch("/api/saved").then((r) => r.json()),
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/saved/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved"] }),
  });

  const savedSearches = data?.savedSearches ?? [];

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          Saved Searches
        </SheetTitle>
        <SheetClose onClose={onClose} />
      </SheetHeader>

      <SheetContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : savedSearches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
            <Search className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No saved searches yet.</p>
            <p className="text-xs text-muted-foreground/60">
              Run a search and click the bookmark icon to save it.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedSearches.map((s) => (
              <div
                key={s.id}
                className="group rounded-lg border border-border p-3 hover:border-blue-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="flex-1 text-left"
                    onClick={() => {
                      onSearchSelect?.(s.query, s.platforms);
                      onClose();
                    }}
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-blue-300 transition-colors truncate">
                      {s.label ?? s.query}
                    </p>
                    {s.label && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">"{s.query}"</p>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                    onClick={() => deleteMutation.mutate(s.id)}
                    disabled={deleteMutation.isPending}
                    title="Delete saved search"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Platform tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.platforms.map((p) => (
                    <PlatformBadge key={p} platform={p} showDot={false} className="py-0 text-[10px]" />
                  ))}
                </div>

                {/* Time */}
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-1.5">
                  <Clock className="h-2.5 w-2.5" />
                  {timeAgo(s.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
