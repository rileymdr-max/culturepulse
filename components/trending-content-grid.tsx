import { ExternalLink, Heart, Film, FileText, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { TrendingContent } from "@/lib/platforms/types";

const TYPE_ICONS: Record<string, React.ElementType> = {
  video: Film,
  reel: Film,
  article: FileText,
  tweet: MessageSquare,
  post: MessageSquare,
  image: Heart,
};

interface TrendingContentGridProps {
  content: TrendingContent[];
}

export function TrendingContentGrid({ content }: TrendingContentGridProps) {
  if (!content.length) {
    return (
      <p className="text-sm text-muted-foreground italic">No content data available.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {content.map((item, i) => {
        const Icon = TYPE_ICONS[item.type] ?? MessageSquare;
        return (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <Card className="h-full hover:border-blue-800/60 transition-colors">
              <CardContent className="p-4 flex flex-col gap-2 h-full">
                {/* Type badge */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="capitalize">{item.type}</span>
                </div>

                {/* Title */}
                <p className="text-sm text-foreground line-clamp-3 leading-relaxed flex-1 group-hover:text-blue-300 transition-colors">
                  {item.title}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="h-3 w-3" />
                    {formatNumber(item.engagement)}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </a>
        );
      })}
    </div>
  );
}
