import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, serverError, paymentRequired } from "@/lib/api-helpers";
import { canGenerateBrief } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { generateContentBrief, type BriefTopPost } from "@/lib/content-intelligence";
import { computeAccelerationSignal } from "@/lib/acceleration";

export const maxDuration = 120;

const createSchema = z.object({
  subcultureId: z.string().min(1),
  monitorId: z.string().optional(),
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

  const { subcultureId, monitorId } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } });
    if (!user) return serverError("User not found.");

    if (!canGenerateBrief(user.plan)) {
      return paymentRequired("Content brief generation is available on Starter and above. Upgrade to generate briefs.");
    }

    const subculture = await prisma.subculture.findUnique({ where: { id: subcultureId } });
    if (!subculture) return NextResponse.json({ error: "Subculture not found" }, { status: 404 });

    // Build signal context if a monitorId was provided
    let signalContext = undefined;
    let velocityAtGeneration: number | null = null;

    if (monitorId) {
      const monitor = await prisma.monitor.findFirst({
        where: { id: monitorId, userId: session.user.id },
        include: {
          snapshots: { orderBy: { capturedAt: "desc" }, take: 16 },
        },
      });

      if (monitor && monitor.snapshots.length > 0) {
        const signal = computeAccelerationSignal(monitor.snapshots);
        velocityAtGeneration = signal.velocity;

        // Build top posts from the latest snapshots
        const topPosts: BriefTopPost[] = [];
        const platforms = ["reddit", "twitter"];
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

    const brief = await prisma.contentBrief.create({
      data: {
        userId: session.user.id,
        subcultureId,
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
    });

    console.log(`[briefs] Created "${brief.headline}" for ${subculture.name}`);
    return NextResponse.json({ brief }, { status: 201 });
  } catch (err) {
    console.error("[briefs POST]", err);
    return serverError();
  }
}
