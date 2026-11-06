import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["active", "paused"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request body.", parsed.error.flatten());

  try {
    const monitor = await prisma.monitor.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!monitor) return notFound("Monitor not found.");

    const updated = await prisma.monitor.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
    });

    return NextResponse.json({ monitor: updated });
  } catch (err) {
    console.error("[monitors PATCH]", err);
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
    const monitor = await prisma.monitor.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!monitor) return notFound("Monitor not found.");

    await prisma.monitor.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[monitors DELETE]", err);
    return serverError();
  }
}
