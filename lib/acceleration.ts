/**
 * Acceleration Scoring engine — Step 3 of the Speedbag architecture.
 *
 * Three-component score:
 *   Velocity    — % above 7-run baseline (the what)
 *   Momentum    — is velocity itself rising or falling? (the direction)
 *   Cross-Platform — do Reddit AND Twitter agree? (the signal strength)
 *
 * Combined into a Breakout Score (0–100) that surfaces pre-mainstream moments.
 */

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
  platform: {
    reddit: PlatformAccel;
    twitter: PlatformAccel;
  };
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

function crossPlatformStrength(
  redditVel: number | null,
  twitterVel: number | null
): number {
  if (redditVel === null && twitterVel === null) return 0;
  if (redditVel === null || twitterVel === null) return 30;

  const bothPositive = redditVel > 0 && twitterVel > 0;
  const bothNegative = redditVel < 0 && twitterVel < 0;

  if (bothPositive) {
    // Strength proportional to geometric mean of both velocities, capped at 100
    const strength = Math.sqrt(Math.abs(redditVel) * Math.abs(twitterVel));
    return Math.round(Math.min(100, strength / 1.5));
  }
  if (bothNegative) return 15; // both cooling — consistent but weak
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

  const redditSnaps = byPlatform("reddit");
  const twitterSnaps = byPlatform("twitter");

  const redditCounts = redditSnaps.map((s) => s.postCount);
  const twitterCounts = twitterSnaps.map((s) => s.postCount);

  const redditVel = velocityFor(redditCounts);
  const twitterVel = velocityFor(twitterCounts);

  // Aggregate velocity: average across platforms that have data
  const vels = [redditVel, twitterVel].filter((v): v is number => v !== null);
  const velocity = vels.length > 0 ? Math.round(vels.reduce((a, b) => a + b, 0) / vels.length) : 0;

  // Momentum: use the platform with more data, fall back to aggregate counts
  const allCounts = [...redditCounts, ...twitterCounts]
    .slice(0, 8)
    .map((n) => n);
  const dominantCounts = redditCounts.length >= twitterCounts.length ? redditCounts : twitterCounts;
  const momentum = momentumFor(dominantCounts.length >= 4 ? dominantCounts : allCounts);

  const cp = crossPlatformStrength(redditVel, twitterVel);
  const score = breakoutScore(velocity, momentum, cp);

  return {
    velocity,
    momentum,
    crossPlatformStrength: cp,
    breakoutScore: score,
    isBreakout: score >= 70 || velocity >= 50,
    platform: {
      reddit: { velocity: redditVel, postCount: redditCounts[0] ?? null },
      twitter: { velocity: twitterVel, postCount: twitterCounts[0] ?? null },
    },
  };
}
