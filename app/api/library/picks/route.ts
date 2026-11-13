/**
 * Library picks — the full profiles a Starter or Snapshot user has unlocked.
 *
 * POST   { subcultureId }  → pick a profile (while picks remain)
 * DELETE ?subcultureId=…   → swap one out, once it's been held PICK_LOCK_DAYS
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, serverError, paymentRequired } from "@/lib/api-helpers";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getLibraryAccess, getUserPlan, PICK_LOCK_DAYS } from "@/lib/plan-usage";

const pickSchema = z.object({ subcultureId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const parsed = pickSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("subcultureId is required.");
  const { subcultureId } = parsed.data;

  try {
    const plan = await getUserPlan(session.user.id, session.user.email);
    if (!plan) return serverError("User not found.");
    const access = await getLibraryAccess(session.user.id, plan);
    if (access.full) return NextResponse.json({ ok: true, full: true });
    if (access.pickedIds.includes(subcultureId)) return NextResponse.json({ ok: true });

    if (access.pickedIds.length >= access.pickLimit) {
      return paymentRequired(
        access.pickLimit === 0
          ? "Full library profiles come with every plan, or 3 with a Brand Culture Snapshot."
          : `You've used all ${access.pickLimit} library picks. Swap one out or upgrade to Pro for the full library.`
      );
    }

    const exists = await withDbRetry(() =>
      prisma.subculture.findUnique({ where: { id: subcultureId }, select: { id: true } })
    );
    if (!exists) return NextResponse.json({ error: "Subculture not found" }, { status: 404 });

    await withDbRetry(() =>
      prisma.libraryPick.upsert({
        where: { userId_subcultureId: { userId: session.user.id, subcultureId } },
        create: { userId: session.user.id, subcultureId },
        update: {},
      })
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[library/picks POST]", err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const subcultureId = req.nextUrl.searchParams.get("subcultureId");
  if (!subcultureId) return badRequest("subcultureId is required.");

  try {
    const pick = await withDbRetry(() =>
      prisma.libraryPick.findUnique({
        where: { userId_subcultureId: { userId: session.user.id, subcultureId } },
      })
    );
    if (!pick) return new NextResponse(null, { status: 204 });

    const unlocksAt = new Date(pick.createdAt.getTime() + PICK_LOCK_DAYS * 24 * 60 * 60 * 1000);
    if (unlocksAt > new Date()) {
      return badRequest(
        `Picks can be swapped ${PICK_LOCK_DAYS} days after you add them. This one unlocks on ${unlocksAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
      );
    }

    await withDbRetry(() => prisma.libraryPick.delete({ where: { id: pick.id } }));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[library/picks DELETE]", err);
    return serverError();
  }
}
