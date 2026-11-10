/**
 * Acceleration Scoring engine — Step 3 of the Speedbag architecture.
 *
 * Three-component score:
 *   Velocity    — % above 7-run baseline (the what)
 *   Momentum    — is velocity itself rising or falling? (the direction)
 *   Cross-Platform — do the platforms agree? (the signal strength)
 *
 * Combined into a Breakout Score (0–100) that surfaces pre-mainstream moments.
 */

/** Every platform a monitor can snapshot. Order sets UI and tie-break order. */
export const MONITOR_PLATFORMS = ["reddit", "twitter", "tiktok", "youtube", "instagram", "trends"] as const;
export type MonitorPlatform = (typeof MONITOR_PLATFORMS)[number];

export interface SnapshotLike {
  platform: string;
  postCount: number;
  capturedAt: string | Date;
}

export interface PlatformAccel {
  velocity: number | null;   // % above baseline
  postCount: number | null;  // most recent
}

export type Momentum = "rising" | "stable" | "falling";

export interface AccelerationSignal {
  velocity: number;                    // aggregate % above baseline
  momentum: Momentum;                  // direction of velocity
  crossPlatformStrength: number;       // 0–100
  breakoutScore: number;               // 0–100 composite
  isBreakout: boolean;
  platform: Record<MonitorPlatform, PlatformAccel>;
}

function velocityFor(counts: number[]): number | null {
  if (counts.length < 2) return null;
  const latest = counts[0];
  const history = counts.slice(1, 8);
  const avg = history.reduce((s, n) => s + n, 0) / history.length;
  if (avg === 0) return latest > 0 ? 100 : 0;
  return Math.round(((latest - avg) / avg) * 100);
}

function momentumFor(counts: number[]): Momentum {
  if (counts.length < 4) return "stable";
  const half = Math.floor(counts.length / 2);
  const recent = counts.slice(0, half);
  const earlier = counts.slice(half);
  const recentAvg = recent.reduce((s, n) => s + n, 0) / recent.length;
  const earlierAvg = earlier.reduce((s, n) => s + n, 0) / earlier.length;
  if (earlierAvg === 0) return recentAvg > 0 ? "rising" : "stable";
  const change = (recentAvg - earlierAvg) / earlierAvg;
  if (change > 0.1) return "rising";
  if (change < -0.1) return "falling";
  return "stable";
}

/**
 * How strongly the platforms with data agree. With exactly Reddit + Twitter
 * this matches the original two-platform rules.
 */
function crossPlatformStrength(vels: number[]): number {
  if (vels.length === 0) return 0;
  if (vels.length === 1) return 30;

  const positive = vels.filter((v) => v > 0);
  if (positive.length === vels.length || (positive.length >= 2 && positive.length * 2 > vels.length)) {
    // Geometric mean of the rising platforms, scaled by the share that are rising
    const geo = Math.exp(positive.reduce((s, v) => s + Math.log(v), 0) / positive.length);
    const share = positive.length / vels.length;
    return Math.round(Math.min(100, (geo / 1.5) * share));
  }
  if (vels.every((v) => v < 0)) return 15; // all cooling — consistent but weak
  return 20; // platforms disagree
}

function breakoutScore(
  velocity: number,
  momentum: Momentum,
  crossPlatform: number
): number {
  // Map velocity to 0–100 (−20 → 0, +60 → 100)
  const velScore = Math.min(100, Math.max(0, (velocity + 20) * 1.25));
  const momScore = momentum === "rising" ? 100 : momentum === "stable" ? 50 : 20;
  const raw = velScore * 0.5 + momScore * 0.25 + crossPlatform * 0.25;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function computeAccelerationSignal(snapshots: SnapshotLike[]): AccelerationSignal {
  const byPlatform = (platform: string) =>
    snapshots
      .filter((s) => s.platform === platform)
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());

  const counts = Object.fromEntries(
    MONITOR_PLATFORMS.map((p) => [p, byPlatform(p).map((s) => s.postCount)])
  ) as Record<MonitorPlatform, number[]>;
  const vel = Object.fromEntries(
    MONITOR_PLATFORMS.map((p) => [p, velocityFor(counts[p])])
  ) as Record<MonitorPlatform, number | null>;

  // Aggregate velocity: average across platforms that have data
  const vels = MONITOR_PLATFORMS.map((p) => vel[p]).filter((v): v is number => v !== null);
  const velocity = vels.length > 0 ? Math.round(vels.reduce((a, b) => a + b, 0) / vels.length) : 0;

  // Momentum: use the platform with the most history (first in order on ties).
  // Counts from different platforms aren't mixed — momentumFor reads "stable"
  // until one platform has 4+ runs.
  const dominantCounts = MONITOR_PLATFORMS.map((p) => counts[p]).reduce((best, c) =>
    c.length > best.length ? c : best
  );
  const momentum = momentumFor(dominantCounts);

  const cp = crossPlatformStrength(vels);
  const score = breakoutScore(velocity, momentum, cp);

  return {
    velocity,
    momentum,
    crossPlatformStrength: cp,
    breakoutScore: score,
    isBreakout: score >= 70 || velocity >= 50,
    platform: Object.fromEntries(
      MONITOR_PLATFORMS.map((p) => [p, { velocity: vel[p], postCount: counts[p][0] ?? null }])
    ) as Record<MonitorPlatform, PlatformAccel>,
  };
}
