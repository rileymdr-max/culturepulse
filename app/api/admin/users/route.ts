/**
 * GET /api/admin/users
 * Sign-ups for the admin: everyone waiting for approval, plus the most recent
 * approved accounts.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { DEMO_EMAIL } from "@/lib/demo-policy";

const SELECT = { id: true, name: true, email: true, createdAt: true, approvedAt: true } as const;

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [pending, approved] = await Promise.all([
    prisma.user.findMany({
      where: { approvedAt: null, email: { not: DEMO_EMAIL } },
      orderBy: { createdAt: "asc" },
      select: SELECT,
    }),
    prisma.user.findMany({
      where: { approvedAt: { not: null }, email: { not: DEMO_EMAIL } },
      orderBy: { approvedAt: "desc" },
      take: 50,
      select: SELECT,
    }),
  ]);

  return NextResponse.json({ pending, approved });
}
