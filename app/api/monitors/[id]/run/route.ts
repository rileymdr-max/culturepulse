import { NextRequest, NextResponse } from "next/server";
import { requireSession, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { runMonitor } from "@/lib/monitor-engine";
import { computeAccelerationSignal } from "@/lib/acceleration";

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const monitor = await prisma.monitor.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { subculture: true },
    });
    if (!monitor) return notFound("Monitor not found.");

    await runMonitor(monitor);

    const updated = await prisma.monitor.findUnique({
      where: { id: params.id },
      include: {
        subculture: {
          select: { id: true, name: true, slug: true, category: true, description: true },
        },
        snapshots: { orderBy: { capturedAt: "desc" }, take: 48 },
      },
    });

    return NextResponse.json({
      monitor: { ...updated, signal: computeAccelerationSignal(updated!.snapshots) },
    });
  } catch (err) {
    console.error("[monitors/[id]/run]", err);
    return serverError();
  }
}
