import { NextRequest, NextResponse } from "next/server";
import { requireSession, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const brief = await prisma.contentBrief.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        subculture: {
          select: { id: true, name: true, slug: true, category: true, description: true },
        },
      },
    });

    if (!brief) return notFound("Brief not found.");
    return NextResponse.json({ brief });
  } catch (err) {
    console.error("[briefs/[id] GET]", err);
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
    const brief = await prisma.contentBrief.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!brief) return notFound("Brief not found.");
    await prisma.contentBrief.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[briefs/[id] DELETE]", err);
    return serverError();
  }
}
