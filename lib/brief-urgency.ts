import type { BriefSummary } from "@/hooks/use-briefs";

/** One source of truth for how brief urgency reads across the app. */
export const URGENCY: Record<BriefSummary["urgency"], { label: string; detail: string; text: string }> = {
  "act-now":   { label: "Act now",   detail: "24–72 hour window", text: "text-signal" },
  "this-week": { label: "This week", detail: "7-day window",      text: "text-tier-trending" },
  monitor:     { label: "Monitor",   detail: "Signal still building", text: "text-muted-foreground" },
};

export function urgencyOf(u: string) {
  return URGENCY[u as BriefSummary["urgency"]] ?? URGENCY.monitor;
}
