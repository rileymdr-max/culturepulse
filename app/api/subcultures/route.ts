import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma, withDbRetry } from "@/lib/prisma";
import { isDemoEmail } from "@/lib/demo";
import { canOpenSubculture, getLibraryAccess, getUserPlan } from "@/lib/plan-usage";

export async function GET(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const isDemo = isDemoEmail(session.user.email);

  try {
    const subcultures = await withDbRetry(() => prisma.subculture.findMany({
      where: {
        ...(category ? { category } : {}),
        // Demo users only see approved, demo-visible entries; others see all
        ...(isDemo ? { status: "approved", demoVisible: true } : status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        status: true,
        generatedByAi: true,
        enrichedByApify: true,
        createdAt: true,
        updatedAt: true,
        platforms: true,
      },
    }));

    // Plan: Pro and above see the whole library; others see teasers except
    // for the profiles they've picked.
    const plan = (await getUserPlan(session.user.id, session.user.email)) ?? "free";
    const access = await getLibraryAccess(session.user.id, plan);
    const withLocks = subcultures.map(({ platforms, ...s }) => {
      const locked = !canOpenSubculture(access, s.id);
      return { ...s, locked, platformNames: locked ? [] : topPlatformNames(platforms) };
    });

    return NextResponse.json({
      subcultures: withLocks,
      total: subcultures.length,
      access: { full: access.full, pickLimit: access.pickLimit, picked: access.pickedIds.length },
    });
  } catch (err) {
    console.error("[subcultures]", err);
    return serverError();
  }
}

/** Platform names for Library cards: primary platforms first, at most four. Locked teasers get none. */
function topPlatformNames(platforms: unknown): string[] {
  if (!Array.isArray(platforms)) return [];
  const rank = (lvl: unknown) => (lvl === "primary" ? 0 : lvl === "secondary" ? 1 : 2);
  return (platforms as { platform?: unknown; engagement_level?: unknown }[])
    .filter((p) => typeof p?.platform === "string")
    .sort((a, b) => rank(a.engagement_level) - rank(b.engagement_level))
    .map((p) => p.platform as string)
    .slice(0, 4);
}
