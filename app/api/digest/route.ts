import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyDigest, type DigestMonitor } from "@/lib/email";
import { computeAccelerationScore } from "@/lib/monitor-engine";

// Called by Vercel Cron every Monday at 8 AM UTC.
export const maxDuration = 60;
// Never prerender: this route sends emails / runs scrapers and must only run when called.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const sent = await sendDigestToAllUsers();
    console.log(`[digest] sent to ${sent} users`);
    return NextResponse.json({ sent, sentAt: new Date().toISOString() });
  } catch (err) {
    console.error("[digest]", err);
    return NextResponse.json({ error: "Digest failed" }, { status: 500 });
  }
}

async function sendDigestToAllUsers(): Promise<number> {
  // Get all users who have at least one active monitor
  const users = await prisma.user.findMany({
    where: {
      monitors: { some: { status: "active" } },
    },
    select: {
      id: true,
      email: true,
      name: true,
      monitors: {
        where: { status: "active" },
        include: {
          subculture: { select: { name: true } },
          snapshots: {
            orderBy: { capturedAt: "desc" },
            take: 8,
          },
        },
      },
    },
  });

  const now = new Date();
  const weekEnd = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const weekStartDate = new Date(now);
  weekStartDate.setDate(weekStartDate.getDate() - 6);
  const weekStart = weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekOf = `${weekStart} – ${weekEnd}`;

  let sent = 0;
  for (const user of users) {
    if (!user.email) continue;

    const monitors: DigestMonitor[] = user.monitors.map((m) => {
      const engagements = m.snapshots.map((s) => s.engagement);
      const breakoutScore = Math.max(0, computeAccelerationScore(engagements));

      let trend: DigestMonitor["trend"] = "stable";
      if (engagements.length >= 3) {
        const recent = engagements.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const older = engagements.slice(3, 6).reduce((a, b) => a + b, 0) / Math.max(1, engagements.slice(3, 6).length);
        if (older > 0) {
          const delta = (recent - older) / older;
          if (delta > 0.1) trend = "rising";
          else if (delta < -0.1) trend = "falling";
        }
      }

      const topSnap = m.snapshots[0];
      const topPosts = topSnap?.topPosts as { title: string; url: string; score: number }[] | null;
      const topPost = topPosts?.[0];

      return {
        subcultureName: m.subculture.name,
        platforms: m.platforms,
        breakoutScore,
        trend,
        topPost,
      };
    });

    try {
      await sendWeeklyDigest({
        toEmail: user.email,
        toName: user.name ?? "there",
        weekOf,
        monitors,
      });
      sent++;
    } catch (err) {
      console.error(`[digest] failed for user ${user.id}:`, err);
    }
  }

  return sent;
}
