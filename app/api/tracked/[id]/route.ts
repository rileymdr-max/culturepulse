/**
 * DELETE /api/tracked/:id  — stop tracking a community
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const tracked = await prisma.trackedCommunity.findUnique({
      where: { id: params.id },
    });

    if (!tracked || tracked.userId !== session.user.id) {
      return notFound("Tracked community not found.");
    }

    await prisma.trackedCommunity.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[api/tracked DELETE]", err);
    return serverError();
  }
}
