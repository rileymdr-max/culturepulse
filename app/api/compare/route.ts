/**
 * POST /api/compare
 *
 * Fetches 2–4 communities in parallel and returns them with pairwise
 * similarity scores for the side-by-side comparison view.
 *
 * Body:
 *   { communityIds: string[] }  — 2 to 4 community IDs
 *
 * Response:
 *   {
 *     communities: (CommunityData | null)[],
 *     similarityScores: Record<string, number>,  // keyed "idA::idB"
 *     pairLabels: { a: string, b: string, score: number }[]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, enforceRateLimit, badRequest, serverError } from "@/lib/api-helpers";
import { getCommunitiesForComparison } from "@/lib/platforms";
import { computePairwiseScores } from "@/lib/similarity";
import type { CommunityData } from "@/lib/platforms";

const compareSchema = z.object({
  communityIds: z
    .array(z.string().min(1).max(200))
    .min(2, "At least 2 communities required for comparison.")
    .max(4, "Maximum 4 communities can be compared at once."),
});

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  // ── Rate limit: 20 compares / minute ─────────────────────────────────────
  const rateLimitError = await enforceRateLimit(req, session.user.id, "compare", 20);
  if (rateLimitError) return rateLimitError;

  // ── Validate ──────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = compareSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request body.", parsed.error.flatten());
  }

  const { communityIds } = parsed.data;

  // ── Fetch communities in parallel ─────────────────────────────────────────
  try {
    const communities = await getCommunitiesForComparison(communityIds);

    // Filter out nulls for scoring but preserve positions for the UI
    const found = communities.filter((c): c is CommunityData => c !== null);

    // Compute pairwise similarity scores
    const similarityScores = computePairwiseScores(found);

    // Build a flat list of pair labels for easy rendering
    const pairLabels = Object.entries(similarityScores).map(([key, score]) => {
      const [idA, idB] = key.split("::");
      const commA = found.find((c) => c.community_id === idA);
      const commB = found.find((c) => c.community_id === idB);
      return {
        a: commA?.community_name ?? idA,
        b: commB?.community_name ?? idB,
        score,
      };
    });

    return NextResponse.json({
      communities,
      similarityScores,
      pairLabels,
    });
  } catch (err) {
    console.error("[api/compare]", err);
    return serverError();
  }
}
