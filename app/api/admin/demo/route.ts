/**
 * GET  /api/admin/demo  — admin's monitors, briefs, and audit runs with demoVisible flags
 * PATCH /api/admin/demo?type=monitor|brief|audit&id=xxx — toggle demoVisible
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { DEMO_EMAIL } from "@/lib/demo-policy";

const SOURCE_EMAIL = process.env.DEMO_SOURCE_EMAIL?.trim() || "rileymdr@gmail.com";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [monitors, briefs, audits, demoUser] = await Promise.all([
    prisma.monitor.findMany({
      where: { user: { email: SOURCE_EMAIL } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        demoVisible: true,
        status: true,
        platforms: true,
        lastRunAt: true,
        createdAt: true,
        subculture: { select: { name: true, category: true, slug: true } },
      },
    }),
    prisma.contentBrief.findMany({
      where: { user: { email: SOURCE_EMAIL } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        demoVisible: true,
        headline: true,
        urgency: true,
        createdAt: true,
        subculture: { select: { name: true, slug: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { user: { email: SOURCE_EMAIL } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, demoVisible: true, handle: true, platform: true, createdAt: true },
    }),
    prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      select: { updatedAt: true },
    }),
  ]);

  return NextResponse.json({
    monitors,
    briefs,
    audits,
    lastSyncAt: demoUser?.updatedAt ?? null,
  });
}

const patchSchema = z.object({
  type: z.enum(["monitor", "brief", "audit"]),
  id: z.string().min(1),
  demoVisible: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { type, id, demoVisible } = body.data;

  if (type === "monitor") {
    const updated = await prisma.monitor.update({ where: { id }, data: { demoVisible }, select: { id: true, demoVisible: true } });
    return NextResponse.json(updated);
  }
  if (type === "brief") {
    const updated = await prisma.contentBrief.update({ where: { id }, data: { demoVisible }, select: { id: true, demoVisible: true } });
    return NextResponse.json(updated);
  }
  // audit
  const updated = await prisma.auditLog.update({ where: { id }, data: { demoVisible }, select: { id: true, demoVisible: true } });
  return NextResponse.json(updated);
}
