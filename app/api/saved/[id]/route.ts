/**
 * DELETE /api/saved/:id — delete a saved search by ID
 *
 * Only the owning user can delete their own saved searches.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const { id } = params;

  try {
    // Verify the record belongs to this user before deleting
    const saved = await prisma.savedSearch.findUnique({ where: { id } });
    if (!saved || saved.userId !== session.user.id) {
      return notFound("Saved search not found.");
    }

    await prisma.savedSearch.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[api/saved DELETE]", err);
    return serverError();
  }
}
