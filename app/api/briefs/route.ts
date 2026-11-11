import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, serverError, paymentRequired } from "@/lib/api-helpers";
import { canGenerateBrief, getPlan } from "@/lib/plans";
import { countBriefsThisMonth, getUserPlan } from "@/lib/plan-usage";
import { prisma, withDbRetry } from "@/lib/prisma";
import { generateContentBrief, type BriefTopPost } from "@/lib/content-intelligence";
import { computeAccelerationSignal } from "@/lib/acceleration";

export const maxDuration = 120;

const createSchema = z.object({
  subcultureId: z.string().min(1).optional(),
  subcultureSlug: z.string().min(1).optional(),
  monitorId: z.string().optional(),
}).refine((d) => d.subcultureId || d.subcultureSlug, {
  message: "Either subcultureId or subcultureSlug is required",
});

export async function GET(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const subcultureId = req.nextUrl.searchParams.get("subcultureId") ?? undefined;

  try {
    const briefs = await prisma.contentBrief.findMany({
      where: {
        userId: session.user.id,
        ...(subcultureId ? { subcultureId } : {}),
      },
      include: {
        subculture: {
          select: { id: true, name: true, slug: true, category: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ briefs });
  } catch (err) {
    console.error("[briefs GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Request body must be valid JSON."); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request body.", parsed.error.flatten());

  const { subcultureId, subcultureSlug, monitorId } = parsed.data;

  try {
    const plan = await getUserPlan(session.user.id, session.user.email);
    if (!plan) return serverError("User not found.");
    const usedThisMonth = await countBriefsThisMonth(session.user.id);
    if (!canGenerateBrief(plan, usedThisMonth)) {
      const limit = getPlan(plan).limits.briefs;
      return paymentRequired(
        limit === 0
          ? "Content briefs are available on Starter and above. Upgrade to generate briefs."
          : `You've used all ${limit} content briefs on your ${getPlan(plan).name} plan this month. Upgrade for more.`
      );
    }

    let subculture = await withDbRetry(() =>
      subcultureId
        ? prisma.subculture.findUnique({ where: { id: subcultureId } })
        : prisma.subculture.findUnique({ where: { slug: subcultureSlug! } })
    );
    // Fallback: if slug didn't match (Claude may generate slugs that differ from DB), try name search
    if (!subculture && subcultureSlug) {
      const nameGuess = subcultureSlug.replace(/-/g, " ");
      subculture = await withDbRetry(() =>
        prisma.subculture.findFirst({
          where: { name: { contains: nameGuess, mode: "insensitive" } },
        })
      );
    }
    if (!subculture) return NextResponse.json({ error: "Subculture not found" }, { status: 404 });

    // Build signal context if a monitorId was provided
    let signalContext = undefined;
    let velocityAtGeneration: number | null = null;

    if (monitorId) {
      const monitor = await prisma.monitor.findFirst({
        where: { id: monitorId, userId: session.user.id },
        include: {
          snapshots: { orderBy: { capturedAt: "desc" }, take: 48 },
        },
      });

      if (monitor && monitor.snapshots.length > 0) {
        const signal = computeAccelerationSignal(monitor.snapshots);
        velocityAtGeneration = signal.velocity;

        // Build top posts from the latest snapshots
        const topPosts: BriefTopPost[] = [];
        const platforms = ["reddit", "twitter", "tiktok", "youtube", "instagram"];
        for (const platform of platforms) {
          const latestSnap = monitor.snapshots.find((s) => s.platform === platform);
          if (latestSnap && Array.isArray(latestSnap.topPosts)) {
            for (const post of (latestSnap.topPosts as Array<{ title?: string; url?: string; score?: number }>) .slice(0, 3)) {
              topPosts.push({
                title: post.title ?? "",
                url: post.url ?? "",
                score: post.score ?? 0,
                platform,
              });
            }
          }
        }

        signalContext = { signal, topPosts };
      }
    }

    const generated = await generateContentBrief(subculture, signalContext);

    const brief = await withDbRetry(() => prisma.contentBrief.create({
      data: {
        userId: session.user.id,
        subcultureId: subculture.id,
        monitorId: monitorId ?? null,
        headline: generated.headline,
        urgency: generated.urgency,
        momentSummary: generated.moment_summary,
        accelerationContext: generated.acceleration_context,
        contentAngles: generated.content_angles as object[],
        platformStrategy: generated.platform_strategy as object[],
        brandFit: generated.brand_fit as object,
        velocityAtGeneration,
      },
      include: {
        subculture: {
          select: { id: true, name: true, slug: true, category: true },
        },
      },
    }));

    console.log(`[briefs] Created "${brief.headline}" for ${subculture.name}`);
    return NextResponse.json({ brief }, { status: 201 });
  } catch (err) {
    console.error("[briefs POST]", err);
    return serverError();
  }
}
