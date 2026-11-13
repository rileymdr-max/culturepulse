import {
  siReddit, siTiktok, siInstagram, siYoutube, siX, siSubstack, siFacebook, siDiscord,
  siTwitch, siThreads, siPinterest, siSnapchat, siLinkedin, siBluesky, siSpotify, siTumblr,
  type SimpleIcon,
} from "simple-icons";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

/* Real platform logos (Simple Icons, CC0). Platform names come from Claude as free text
   ("Instagram Reels", "X (Twitter)", "Reddit & Discord"), so we match loosely and can
   return more than one logo for a combined name. */

const MATCHERS: [RegExp, SimpleIcon][] = [
  [/reddit/i, siReddit],
  [/tiktok/i, siTiktok],
  [/instagram|\breels\b/i, siInstagram],
  [/youtube|\bshorts\b/i, siYoutube],
  [/twitter|^x\b|\bx\s*[(/]|\/\s*x\b/i, siX],
  [/substack|newsletter/i, siSubstack],
  [/facebook/i, siFacebook],
  [/discord/i, siDiscord],
  [/twitch/i, siTwitch],
  [/threads/i, siThreads],
  [/pinterest/i, siPinterest],
  [/snapchat/i, siSnapchat],
  [/linkedin/i, siLinkedin],
  [/bluesky/i, siBluesky],
  [/spotify|podcast/i, siSpotify],
  [/tumblr/i, siTumblr],
];

/** Brand colours too light to read on a white card fall back to ink. */
const TOO_LIGHT = new Set(["FFFC00"]);

export function platformIcons(platform: string): SimpleIcon[] {
  return MATCHERS
    .map(([re, icon]) => ({ icon, at: platform.search(re) }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((m) => m.icon)
    .slice(0, 3);
}

function Logo({ icon, className }: { icon: SimpleIcon; className?: string }) {
  const fill = TOO_LIGHT.has(icon.hex) ? "currentColor" : `#${icon.hex}`;
  return (
    <svg role="img" viewBox="0 0 24 24" className={cn("shrink-0", className)} fill={fill} aria-label={icon.title}>
      <path d={icon.path} />
    </svg>
  );
}

/** One or more platform logos for a free-text platform name; a globe if nothing matches. */
export function PlatformLogos({ platform, className }: { platform: string; className?: string }) {
  const icons = platformIcons(platform);
  if (icons.length === 0) return <Globe className={cn("shrink-0 text-muted-foreground", className)} aria-hidden />;
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {icons.map((icon) => <Logo key={icon.slug} icon={icon} className={className} />)}
    </span>
  );
}

/** De-duplicated logos for a list of platform names (e.g. a brief's platform strategy). */
export function PlatformLogoRow({ platforms, className, max = 6 }: { platforms: string[]; className?: string; max?: number }) {
  const seen = new Map<string, SimpleIcon>();
  for (const p of platforms) for (const icon of platformIcons(p)) seen.set(icon.slug, icon);
  const icons = [...seen.values()].slice(0, max);
  if (icons.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {icons.map((icon) => <Logo key={icon.slug} icon={icon} className={className} />)}
    </span>
  );
}
