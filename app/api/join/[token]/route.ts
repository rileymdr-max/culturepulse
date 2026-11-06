import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

async function getValidInvite(token: string) {
  return prisma.workspaceInvite.findFirst({
    where: { token, acceptedAt: null, expiresAt: { gt: new Date() } },
    include: { workspace: { select: { id: true, name: true } } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const invite = await getValidInvite(params.token);

  if (!invite) {
    return NextResponse.json({ error: "Invite is invalid or has expired." }, { status: 404 });
  }

  return NextResponse.json({
    invite: {
      workspaceName: invite.workspace.name,
      invitedEmail: invite.email,
    },
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const invite = await getValidInvite(params.token);
    if (!invite) {
      return NextResponse.json({ error: "Invite is invalid or has expired." }, { status: 404 });
    }

    // Check not already a member
    const existing = await prisma.workspaceMember.findFirst({
      where: { workspaceId: invite.workspaceId, userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json({ error: "You are already a member of this workspace." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
          role: invite.role,
        },
      }),
      prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ workspaceId: invite.workspaceId });
  } catch (err) {
    console.error("[join POST]", err);
    return serverError();
  }
}
