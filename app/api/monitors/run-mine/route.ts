import { NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { runMonitor } from "@/lib/monitor-engine";

// "Run all now" on the Signal Board: runs only the signed-in user's active
// monitors. The scheduled job for everyone lives at /api/monitors/run.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const monitors = await prisma.monitor.findMany({
      where: { userId: session.user.id, status: "active" },
      include: { subculture: true },
    });

    let ran = 0;
    let failed = 0;
    for (const monitor of monitors) {
      try {
        await runMonitor(monitor);
        ran++;
      } catch (err) {
        console.error(`[monitors/run-mine] failed monitor ${monitor.id}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ ran, failed, skipped: 0 });
  } catch (err) {
    console.error("[monitors/run-mine]", err);
    return serverError();
  }
}
