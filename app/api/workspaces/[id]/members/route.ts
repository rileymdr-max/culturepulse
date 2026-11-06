import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["admin", "member"]),
});

async function isOwnerOrAdmin(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId, role: { in: ["owner", "admin"] } },
  });
  return !!member;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const isMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: params.id, userId: session.user.id },
    });
    if (!isMember) return notFound("Workspace not found.");

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: params.id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({ members });
  } catch (err) {
    console.error("[workspace/members GET]", err);
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

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request.", parsed.error.flatten());

  try {
    if (!await isOwnerOrAdmin(params.id, session.user.id)) {
      return notFound("Workspace not found.");
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: params.id, userId: parsed.data.userId },
    });
    if (!member) return notFound("Member not found.");
    if (member.role === "owner") return badRequest("Cannot change the owner's role.");

    const updated = await prisma.workspaceMember.update({
      where: { id: member.id },
      data: { role: parsed.data.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ member: updated });
  } catch (err) {
    console.error("[workspace/members PATCH]", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return badRequest("userId is required.");

  try {
    // Allow self-removal OR owner/admin removing others
    const isSelf = userId === session.user.id;
    if (!isSelf && !await isOwnerOrAdmin(params.id, session.user.id)) {
      return notFound("Workspace not found.");
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: params.id, userId },
    });
    if (!member) return notFound("Member not found.");
    if (member.role === "owner" && !isSelf) return badRequest("Cannot remove the workspace owner.");

    await prisma.workspaceMember.delete({ where: { id: member.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[workspace/members DELETE]", err);
    return serverError();
  }
}
