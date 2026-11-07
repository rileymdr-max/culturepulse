import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, serverError, paymentRequired } from "@/lib/api-helpers";
import { canCreateMonitor } from "@/lib/plans";
import { getEffectivePlan } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { computeAccelerationSignal } from "@/lib/acceleration";

const createSchema = z.object({
  subcultureId: z.string().min(1),
  platforms: z.array(z.enum(["reddit", "twitter"])).min(1).default(["reddit", "twitter"]),
});

export async function GET(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const subcultureId = req.nextUrl.searchParams.get("subcultureId") ?? undefined;

  try {
    const monitors = await prisma.monitor.findMany({
      where: {
        userId: session.user.id,
        ...(subcultureId ? { subcultureId } : {}),
      },
      include: {
        subculture: {
          select: { id: true, name: true, slug: true, category: true, description: true },
        },
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 16,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const monitorsWithSignals = monitors.map((m) => ({
      ...m,
      signal: computeAccelerationSignal(m.snapshots),
    }));

    return NextResponse.json({ monitors: monitorsWithSignals });
  } catch (err) {
    console.error("[monitors GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request body.", parsed.error.flatten());

  const { subcultureId, platforms } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } });
    if (!user) return serverError("User not found.");

    const currentCount = await prisma.monitor.count({ where: { userId: session.user.id } });
    if (!canCreateMonitor(getEffectivePlan(session.user.email, user.plan), currentCount)) {
      return paymentRequired(
        `You've reached the monitor limit for your ${user.plan} plan. Upgrade to add more monitors.`
      );
    }

    const subculture = await prisma.subculture.findUnique({ where: { id: subcultureId } });
    if (!subculture) return NextResponse.json({ error: "Subculture not found" }, { status: 404 });

    const monitor = await prisma.monitor.upsert({
      where: { userId_subcultureId: { userId: session.user.id, subcultureId } },
      create: {
        userId: session.user.id,
        subcultureId,
        platforms,
        status: "active",
      },
      update: { status: "active", platforms },
      include: {
        subculture: {
          select: { id: true, name: true, slug: true, category: true, description: true },
        },
        snapshots: { orderBy: { capturedAt: "desc" }, take: 16 },
      },
    });

    return NextResponse.json(
      { monitor: { ...monitor, signal: computeAccelerationSignal(monitor.snapshots) } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[monitors POST]", err);
    return serverError();
  }
}
