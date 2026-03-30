import { cn } from "@/lib/utils";

const PLATFORM_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  reddit: {
    label: "Reddit",
    color: "bg-orange-900/40 text-orange-400 border-orange-800/60",
    dot: "bg-orange-400",
  },
  twitter: {
    label: "X / Twitter",
    color: "bg-slate-800/60 text-slate-300 border-slate-700",
    dot: "bg-slate-300",
  },
  substack: {
    label: "Substack",
    color: "bg-amber-900/40 text-amber-400 border-amber-800/60",
    dot: "bg-amber-400",
  },
  tiktok: {
    label: "TikTok",
    color: "bg-pink-900/40 text-pink-400 border-pink-800/60",
    dot: "bg-pink-400",
  },
  instagram: {
    label: "Instagram",
    color: "bg-purple-900/40 text-purple-400 border-purple-800/60",
    dot: "bg-purple-400",
  },
  facebook: {
    label: "Facebook",
    color: "bg-blue-900/40 text-blue-400 border-blue-800/60",
    dot: "bg-blue-400",
  },
};

interface PlatformBadgeProps {
  platform: string;
  className?: string;
  showDot?: boolean;
}

export function PlatformBadge({ platform, className, showDot = true }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform.toLowerCase()] ?? {
    label: platform,
    color: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.color,
        className
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />}
      {config.label}
    </span>
  );
}

/** Returns the accent color class for a platform (for charts, etc.) */
export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    reddit: "#fb923c",
    twitter: "#94a3b8",
    substack: "#fbbf24",
    tiktok: "#f472b6",
    instagram: "#c084fc",
    facebook: "#60a5fa",
  };
  return colors[platform.toLowerCase()] ?? "#6b7280";
}
