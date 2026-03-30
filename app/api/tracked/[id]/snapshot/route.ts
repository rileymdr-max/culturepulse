/**
 * POST /api/tracked/:id/snapshot
 *
 * Captures a new metric snapshot for a tracked community.
 * Called automatically when a user visits a tracked community's detail page.
 * Throttled to one snapshot per hour per community to avoid duplicates.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  communitySize: z.number().int().positive(),
  topTopics:     z.array(z.string()).max(10),
  topCategories: z.array(z.object({ label: z.string(), volume: z.number() })).max(12),
  force:         z.boolean().optional().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON."); }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid snapshot data.", parsed.error.flatten());

  try {
    const tracked = await prisma.trackedCommunity.findUnique({
      where: { id: params.id },
    });

    if (!tracked || tracked.userId !== session.user.id) {
      return notFound("Tracked community not found.");
    }

    // Throttle: skip if a snapshot was captured in the last hour (unless force=true)
    if (!parsed.data.force) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await prisma.communitySnapshot.findFirst({
        where: { trackedCommunityId: params.id, capturedAt: { gte: oneHourAgo } },
      });
      if (recent) {
        return NextResponse.json({ skipped: true, reason: "Snapshot captured within last hour" });
      }
    }

    const snapshot = await prisma.communitySnapshot.create({
      data: {
        trackedCommunityId: params.id,
        communitySize:      parsed.data.communitySize,
        topTopics:          parsed.data.topTopics,
        topCategories:      parsed.data.topCategories,
      },
    });

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (err) {
    console.error("[api/tracked/snapshot]", err);
    return serverError();
  }
}
