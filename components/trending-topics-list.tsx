import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { TrendingTopic } from "@/lib/platforms/types";

interface TrendingTopicsListProps {
  topics: TrendingTopic[];
}

function VelocityIndicator({ velocity }: { velocity: number }) {
  if (velocity > 20) {
    return (
      <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-medium">
        <TrendingUp className="h-3.5 w-3.5" />
        +{velocity}%
      </span>
    );
  }
  if (velocity < -10) {
    return (
      <span className="flex items-center gap-0.5 text-red-400 text-xs font-medium">
        <TrendingDown className="h-3.5 w-3.5" />
        {velocity}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
      <Minus className="h-3.5 w-3.5" />
      {velocity > 0 ? `+${velocity}` : velocity}%
    </span>
  );
}

export function TrendingTopicsList({ topics }: TrendingTopicsListProps) {
  const sorted = [...topics].sort((a, b) => b.volume - a.volume);

  return (
    <ol className="space-y-2">
      {sorted.map((topic, i) => (
        <li
          key={topic.topic}
          className="flex items-center gap-3 py-2 border-b border-border last:border-0"
        >
          {/* Rank */}
          <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">
            {i + 1}
          </span>

          {/* Topic */}
          <span className="flex-1 text-sm font-medium text-foreground truncate">
            {topic.topic}
          </span>

          {/* Volume */}
          <span className="text-xs text-muted-foreground shrink-0">
            {formatNumber(topic.volume)}
          </span>

          {/* Velocity */}
          <div className="shrink-0 w-16 text-right">
            <VelocityIndicator velocity={topic.velocity} />
          </div>
        </li>
      ))}
    </ol>
  );
}
