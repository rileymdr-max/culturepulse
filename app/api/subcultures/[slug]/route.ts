import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma, withDbRetry } from "@/lib/prisma";
import { canOpenSubculture, getLibraryAccess, getUserPlan } from "@/lib/plan-usage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const subculture = await withDbRetry(() => prisma.subculture.findUnique({
      where: { slug: params.slug },
    }));

    if (!subculture) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Plan: locked profiles return a teaser only.
    const plan = (await getUserPlan(session.user.id, session.user.email)) ?? "free";
    const access = await getLibraryAccess(session.user.id, plan);
    if (!canOpenSubculture(access, subculture.id)) {
      const { id, slug, name, description, category, status } = subculture;
      return NextResponse.json({
        subculture: { id, slug, name, description, category, status },
        locked: true,
        access: { full: access.full, pickLimit: access.pickLimit, picked: access.pickedIds.length },
      });
    }

    return NextResponse.json({ subculture, locked: false });
  } catch (err) {
    console.error("[subcultures/[slug]]", err);
    return serverError();
  }
}
