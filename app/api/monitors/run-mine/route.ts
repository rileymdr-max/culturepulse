import { NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { runMonitors } from "@/lib/monitor-engine";

// "Run all now" on the Signal Board: runs only the signed-in user's active
// monitors. The scheduled job for everyone lives at /api/monitors/run.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// A lock older than this is treated as left over from a crashed run
// (longer than maxDuration, so a live run never loses its lock).
const LOCK_STALE_MS = 6 * 60_000;

export async function POST() {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const userId = session.user.id;

  // Claim the per-user lock atomically; a second click or tab gets 409.
  const claimed = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { monitorRunStartedAt: null },
        { monitorRunStartedAt: { lt: new Date(Date.now() - LOCK_STALE_MS) } },
      ],
    },
    data: { monitorRunStartedAt: new Date() },
  });
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "already_running", message: "A run is already in progress. Results appear when it finishes." },
      { status: 409 }
    );
  }

  try {
    const monitors = await prisma.monitor.findMany({
      where: { userId, status: "active" },
      include: { subculture: true },
      orderBy: { lastRunAt: { sort: "asc", nulls: "first" } },
    });

    const summary = await runMonitors(monitors, { logTag: "monitors/run-mine" });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[monitors/run-mine]", err);
    return serverError();
  } finally {
    await prisma.user
      .update({ where: { id: userId }, data: { monitorRunStartedAt: null } })
      .catch((err) => console.error("[monitors/run-mine] failed to release lock", err));
  }
}
