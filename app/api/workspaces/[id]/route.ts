import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
});

async function getWorkspaceForUser(id: string, userId: string) {
  return prisma.workspace.findFirst({
    where: {
      id,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, role: { in: ["owner", "admin"] } } } },
      ],
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      },
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { members: true } },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const workspace = await getWorkspaceForUser(params.id, session.user.id);
    if (!workspace) return notFound("Workspace not found.");
    return NextResponse.json({ workspace });
  } catch (err) {
    console.error("[workspace GET]", err);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON."); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request.", parsed.error.flatten());

  try {
    const workspace = await getWorkspaceForUser(params.id, session.user.id);
    if (!workspace) return notFound("Workspace not found.");

    const updated = await prisma.workspace.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ workspace: updated });
  } catch (err) {
    console.error("[workspace PATCH]", err);
    return serverError();
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { id: params.id, ownerId: session.user.id },
    });
    if (!workspace) return notFound("Workspace not found or you are not the owner.");

    await prisma.workspace.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[workspace DELETE]", err);
    return serverError();
  }
}
