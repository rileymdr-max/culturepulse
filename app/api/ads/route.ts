/**
 * GET /api/ads?query=<term>
 *
 * Returns Meta Ad Library results for a given query term via Apify.
 * Requires APIFY_API_TOKEN to be set.
 *
 * Query params:
 *   query  — search term (required)
 *   limit  — max ads to return (default 12, max 24)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, enforceRateLimit, badRequest, serverError } from "@/lib/api-helpers";
import { fetchAdIntel } from "@/lib/ad-library";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  // ── Rate limit: 10 ad lookups / minute ───────────────────────────────────
  const rateLimitError = await enforceRateLimit(req, session.user.id, "ads", 10);
  if (rateLimitError) return rateLimitError;

  // ── Require Apify token ───────────────────────────────────────────────────
  if (!env.APIFY_API_TOKEN) {
    return NextResponse.json(
      { ads: [], available: false, reason: "APIFY_API_TOKEN not configured" },
      { status: 200 }
    );
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("query")?.trim();
  if (!query) return badRequest("query param is required.");

  const rawLimit = parseInt(searchParams.get("limit") ?? "12", 10);
  const limit = Math.min(Math.max(rawLimit, 1), 24);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  try {
    const ads = await fetchAdIntel(query, limit);
    return NextResponse.json({ ads, available: true, query });
  } catch (err) {
    console.error("[api/ads]", err);
    // Return empty rather than 500 — ad intel is supplementary
    return NextResponse.json({ ads: [], available: false, reason: "Ad Library fetch failed" });
  }
}
