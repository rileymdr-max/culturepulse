/**
 * GET  /api/saved  — retrieve the authenticated user's saved searches
 * POST /api/saved  — save a new community search to the user's account
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, enforceRateLimit, badRequest, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// ─── GET /api/saved ───────────────────────────────────────────────────────────

/**
 * Returns all saved searches for the authenticated user, newest first.
 *
 * Response:
 *   { savedSearches: SavedSearch[] }
 */
export async function GET(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const rateLimitError = await enforceRateLimit(req, session.user.id, "saved:get", 60);
  if (rateLimitError) return rateLimitError;

  try {
    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100, // cap at 100 for performance
    });

    return NextResponse.json({ savedSearches });
  } catch (err) {
    console.error("[api/saved GET]", err);
    return serverError();
  }
}

// ─── POST /api/saved ──────────────────────────────────────────────────────────

const saveSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  platforms: z
    .array(z.enum(["reddit", "twitter", "substack", "tiktok", "instagram", "facebook"]))
    .min(1)
    .max(6),
  label: z.string().max(100).trim().optional(),
});

/**
 * Saves a search to the user's account.
 *
 * Body:
 *   { query: string, platforms: string[], label?: string }
 *
 * Response:
 *   { savedSearch: SavedSearch }
 */
export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const rateLimitError = await enforceRateLimit(req, session.user.id, "saved:post", 20);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request body.", parsed.error.flatten());
  }

  const { query, platforms, label } = parsed.data;

  try {
    // Enforce a per-user cap of 200 saved searches
    const count = await prisma.savedSearch.count({ where: { userId: session.user.id } });
    if (count >= 200) {
      return badRequest(
        "Saved search limit reached (200). Delete some searches before saving more."
      );
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: session.user.id,
        query,
        platforms,
        label: label ?? null,
      },
    });

    return NextResponse.json({ savedSearch }, { status: 201 });
  } catch (err) {
    console.error("[api/saved POST]", err);
    return serverError();
  }
}
