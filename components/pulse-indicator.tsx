import { RefreshCw } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

interface PulseIndicatorProps {
  lastUpdated: string;
  isRefetching?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function PulseIndicator({
  lastUpdated,
  isRefetching = false,
  onRefresh,
  className,
}: PulseIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      {isRefetching ? (
        <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
      ) : (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      <span>{isRefetching ? "Refreshing…" : `Live · Updated ${timeAgo(lastUpdated)}`}</span>
      {onRefresh && !isRefetching && (
        <button
          onClick={onRefresh}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh now"
          aria-label="Refresh community data"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
