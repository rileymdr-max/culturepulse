import { cn } from "@/lib/utils";

const PLATFORM_CONFIG: Record<
  string,
  { label: string; dot: string }
> = {
  reddit: {
    label: "Reddit",
    dot: "bg-orange-500",
  },
  twitter: {
    label: "X / Twitter",
    dot: "bg-foreground",
  },
  substack: {
    label: "Substack",
    dot: "bg-amber-500",
  },
  tiktok: {
    label: "TikTok",
    dot: "bg-pink-500",
  },
  instagram: {
    label: "Instagram",
    dot: "bg-purple-500",
  },
  facebook: {
    label: "Facebook",
    dot: "bg-blue-500",
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
    dot: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground",
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
