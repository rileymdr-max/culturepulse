/**
 * GET  /api/tracked  — list the current user's tracked communities
 * POST /api/tracked  — start tracking a community
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, enforceRateLimit, badRequest, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  communityId:   z.string().min(1).max(200),
  communityName: z.string().min(1).max(200),
  platform:      z.string().min(1).max(50),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const tracked = await prisma.trackedCommunity.findMany({
      where: { userId: session.user.id },
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 30, // last 30 snapshots per community for the chart
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tracked });
  } catch (err) {
    console.error("[api/tracked GET]", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const rateLimitError = await enforceRateLimit(req, session.user.id, "tracked", 30);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON."); }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request.", parsed.error.flatten());

  const { communityId, communityName, platform } = parsed.data;

  try {
    const tracked = await prisma.trackedCommunity.upsert({
      where: { userId_communityId: { userId: session.user.id, communityId } },
      create: { userId: session.user.id, communityId, communityName, platform },
      update: {},
    });

    return NextResponse.json({ tracked }, { status: 201 });
  } catch (err) {
    console.error("[api/tracked POST]", err);
    return serverError();
  }
}
