import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const inviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(["admin", "member"]).default("member"),
});

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON."); }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request.", parsed.error.flatten());

  try {
    // Must be owner or admin
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: params.id, userId: session.user.id, role: { in: ["owner", "admin"] } },
    });
    if (!membership) return notFound("Workspace not found.");

    const workspace = await prisma.workspace.findUnique({ where: { id: params.id } });
    if (!workspace) return notFound("Workspace not found.");

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existingUser) {
      const alreadyMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: params.id, userId: existingUser.id },
      });
      if (alreadyMember) return badRequest("This user is already a member of this workspace.");
    }

    // Upsert invite (re-use token if pending invite for same email)
    const existing = await prisma.workspaceInvite.findFirst({
      where: { workspaceId: params.id, email: parsed.data.email, acceptedAt: null },
    });

    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = existing
      ? await prisma.workspaceInvite.update({
          where: { id: existing.id },
          data: { role: parsed.data.role, expiresAt },
        })
      : await prisma.workspaceInvite.create({
          data: {
            workspaceId: params.id,
            email: parsed.data.email,
            role: parsed.data.role,
            expiresAt,
          },
        });

    const appUrl = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const inviteUrl = `${appUrl}/join/${invite.token}`;

    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch (err) {
    console.error("[workspace/invite POST]", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const inviteId = req.nextUrl.searchParams.get("inviteId");
  if (!inviteId) return badRequest("inviteId is required.");

  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: params.id, userId: session.user.id, role: { in: ["owner", "admin"] } },
    });
    if (!membership) return notFound("Workspace not found.");

    await prisma.workspaceInvite.deleteMany({ where: { id: inviteId, workspaceId: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[workspace/invite DELETE]", err);
    return serverError();
  }
}
