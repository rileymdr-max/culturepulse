import type { AccelerationSignal } from "@/lib/acceleration";

export type SignalTier = "breakout" | "trending" | "rising" | "stable" | "cooling";

/** Same thresholds as the Signal Board (app/dashboard/monitors). */
export function signalTier(signal: AccelerationSignal): SignalTier {
  if (signal.isBreakout) return "breakout";
  if (signal.breakoutScore >= 55) return "trending";
  if (signal.breakoutScore >= 35 || signal.velocity > 5) return "rising";
  if (signal.velocity < -5) return "cooling";
  return "stable";
}

/** Token-based classes — readable in light and dark mode. */
export const TIER_STYLE: Record<SignalTier, { label: string; text: string }> = {
  breakout: { label: "Breakout", text: "text-tier-breakout" },
  trending: { label: "Trending", text: "text-tier-trending" },
  rising: { label: "Rising", text: "text-tier-rising" },
  stable: { label: "Stable", text: "text-muted-foreground" },
  cooling: { label: "Cooling", text: "text-muted-foreground" },
};
