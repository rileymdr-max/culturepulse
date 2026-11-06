import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const brandingSchema = z.object({
  brandName:    z.string().min(1).max(60).optional(),
  brandLogo:    z.string().url().nullable().optional(),
  brandColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #3b82f6").optional(),
  customDomain: z.string().min(1).max(255).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON."); }

  const parsed = brandingSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid branding data.", parsed.error.flatten());

  try {
    // Only owner/admin can update branding
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: params.id, userId: session.user.id, role: { in: ["owner", "admin"] } },
    });
    if (!membership) return notFound("Workspace not found.");

    const updated = await prisma.workspace.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ workspace: updated });
  } catch (err) {
    console.error("[workspace/branding PATCH]", err);
    return serverError();
  }
}
