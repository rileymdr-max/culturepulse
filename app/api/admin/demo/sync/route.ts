/**
 * POST /api/admin/demo/sync — manually trigger demo account sync.
 * Only copies items flagged demoVisible=true from the admin account.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { syncDemoData } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { DEMO_EMAIL } from "@/lib/demo-policy";

export const maxDuration = 30;

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  let demoUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: { email: DEMO_EMAIL, name: "Demo", plan: "pro", onboardedAt: new Date(), approvedAt: new Date() },
    });
  }

  const counts = await syncDemoData(demoUser.id);
  const updated = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, select: { updatedAt: true } });

  return NextResponse.json({ ok: true, synced: counts, lastSyncAt: updated?.updatedAt });
}
