import { NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { runMonitors } from "@/lib/monitor-engine";

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
      orderBy: { lastRunAt: { sort: "asc", nulls: "first" } },
    });

    const summary = await runMonitors(monitors, { logTag: "monitors/run-mine" });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[monitors/run-mine]", err);
    return serverError();
  }
}
