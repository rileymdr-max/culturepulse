/**
 * Spike detection — velocity-based anomaly detection for community metrics.
 *
 * A "spike" is abnormal RATE OF GROWTH between two snapshots, not raw volume.
 * This separates "trending" (high absolute volume) from "spiking" (breaking out right now).
 */

import type { CommunitySnapshot } from "@/hooks/use-tracked";

export type SpikeType = "new_topic" | "rising_topic" | "category_surge" | "size_surge";
export type SpikeSeverity = "high" | "medium";

export interface Spike {
  label: string;
  type: SpikeType;
  changeLabel: string;
  severity: SpikeSeverity;
}

/**
 * Compares the two most recent snapshots and returns detected spikes.
 * Returns an empty array if fewer than 2 snapshots exist.
 *
 * Snapshots must be in descending order (latest first), as returned by the API.
 */
export function detectSpikes(snapshots: CommunitySnapshot[]): Spike[] {
  if (snapshots.length < 2) return [];

  const latest = snapshots[0];
  const previous = snapshots[1];
  const spikes: Spike[] = [];

  // ── 1. New topics ───────────────────────────────────────────────────────────
  // Topics in the latest snapshot that didn't exist in the previous one
  // are breaking out from zero — highest-signal spike.
  for (const topic of latest.topTopics) {
    if (!previous.topTopics.includes(topic)) {
      spikes.push({
        label: topic,
        type: "new_topic",
        changeLabel: "New — not in previous snapshot",
        severity: "high",
      });
    }
  }

  // ── 2. Rapidly rising topics ────────────────────────────────────────────────
  // Topics that moved up significantly in the ranking between snapshots.
  for (let i = 0; i < latest.topTopics.length; i++) {
    const topic = latest.topTopics[i];
    const prevIndex = previous.topTopics.indexOf(topic);
    const positions = prevIndex - i;
    if (prevIndex !== -1 && positions >= 2) {
      spikes.push({
        label: topic,
        type: "rising_topic",
        changeLabel: `↑ Jumped ${positions} position${positions !== 1 ? "s" : ""} in ranking`,
        severity: positions >= 3 ? "high" : "medium",
      });
    }
  }

  // ── 3. Category volume surges ───────────────────────────────────────────────
  // Conversation categories whose engagement volume grew significantly.
  for (const cat of latest.topCategories) {
    const prev = previous.topCategories.find((c) => c.label === cat.label);
    if (!prev || prev.volume === 0) continue;
    const growthPct = ((cat.volume - prev.volume) / prev.volume) * 100;
    if (growthPct >= 30) {
      spikes.push({
        label: cat.label,
        type: "category_surge",
        changeLabel: `↑ ${Math.round(growthPct)}% volume increase`,
        severity: growthPct >= 75 ? "high" : "medium",
      });
    }
  }

  // ── 4. Community size surge ─────────────────────────────────────────────────
  // Abnormal membership/view growth between snapshots.
  if (previous.communitySize > 0) {
    const growthPct =
      ((latest.communitySize - previous.communitySize) / previous.communitySize) * 100;
    if (growthPct >= 5) {
      spikes.push({
        label: "Community size",
        type: "size_surge",
        changeLabel: `↑ ${Math.round(growthPct)}% member growth`,
        severity: growthPct >= 15 ? "high" : "medium",
      });
    }
  }

  // Sort: high severity first, then by type priority
  const typePriority: Record<SpikeType, number> = {
    new_topic: 0,
    category_surge: 1,
    rising_topic: 2,
    size_surge: 3,
  };

  return spikes.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return typePriority[a.type] - typePriority[b.type];
  });
}

export const TYPE_LABELS: Record<SpikeType, string> = {
  new_topic:      "New Topic",
  rising_topic:   "Rising Fast",
  category_surge: "Category Surge",
  size_surge:     "Size Surge",
};

/**
 * Returns a deep link to the platform's live search or hashtag page for a topic.
 * Lets users immediately see what content is driving a spike.
 */
export function getContentUrl(platform: string, communityId: string, topic: string): string {
  const clean = topic.replace(/^#/, "");
  const encoded = encodeURIComponent(clean);

  switch (platform) {
    case "reddit": {
      // e.g. reddit_r_gaming → r/gaming
      const sub = communityId.replace(/^reddit_/, "").replace(/_/g, "/");
      return `https://www.reddit.com/${sub}/search/?q=${encoded}&sort=new&restrict_sr=1`;
    }
    case "twitter":
      return `https://x.com/search?q=%23${encoded}&f=live`;
    case "tiktok":
      return `https://www.tiktok.com/search?q=${encoded}`;
    case "instagram":
      return `https://www.instagram.com/explore/tags/${encoded}/`;
    case "facebook":
      return `https://www.facebook.com/search/posts/?q=${encoded}`;
    case "substack":
      return `https://substack.com/search?query=${encoded}`;
    default:
      return `https://www.google.com/search?q=${encoded}+site:${platform}.com`;
  }
}
