import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, serverError, paymentRequired } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { canCreateWorkspace } from "@/lib/plans";
import { getEffectivePlan } from "@/lib/admin";

const createSchema = z.object({
  name: z.string().min(2).max(60),
});

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(_req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ workspaces });
  } catch (err) {
    console.error("[workspaces GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON."); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request.", parsed.error.flatten());

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });
    if (!user) return serverError("User not found.");

    const existing = await prisma.workspace.count({ where: { ownerId: session.user.id } });

    if (!canCreateWorkspace(getEffectivePlan(session.user.email, user.plan), existing)) {
      return paymentRequired("You've reached your plan's workspace limit. Pro includes 1 workspace; Studio includes 10.");
    }

    const baseSlug = toSlug(parsed.data.name);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: parsed.data.name,
        slug,
        ownerId: session.user.id,
        members: {
          create: { userId: session.user.id, role: "owner" },
        },
      },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err) {
    console.error("[workspaces POST]", err);
    return serverError();
  }
}
