import { ExternalLink, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { TopVoice } from "@/lib/platforms/types";

interface TopVoicesListProps {
  voices: TopVoice[];
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : name.slice(0, 2);
  return <span>{initials.toUpperCase()}</span>;
}

export function TopVoicesList({ voices }: TopVoicesListProps) {
  if (!voices.length) {
    return (
      <p className="text-sm text-muted-foreground italic">No creator data available.</p>
    );
  }

  const sorted = [...voices].sort((a, b) => b.followers - a.followers);

  return (
    <div className="space-y-3">
      {sorted.map((voice, i) => (
        <a
          key={i}
          href={voice.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-blue-800/60 hover:bg-accent/30 transition-colors group"
        >
          {/* Avatar placeholder */}
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-900 to-purple-900 border border-border flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
            {voice.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={voice.avatar}
                alt={voice.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <Initials name={voice.name} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate group-hover:text-blue-300 transition-colors">
              {voice.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{voice.handle}</p>
          </div>

          {/* Followers */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3.5 w-3.5" />
            {formatNumber(voice.followers)}
          </div>

          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-400 transition-colors shrink-0" />
        </a>
      ))}
    </div>
  );
}
