/**
 * GET /api/ads?query=<term>
 *
 * Returns ad intelligence from Meta Ad Library and TikTok Ad Library
 * in parallel via Apify. Requires APIFY_API_TOKEN.
 *
 * Query params:
 *   query  — search term (required)
 *   limit  — max ads per source (default 12, max 24)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, enforceRateLimit, badRequest } from "@/lib/api-helpers";
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
      { meta: [], tiktok: [], available: false, reason: "APIFY_API_TOKEN not configured" },
      { status: 200 }
    );
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("query")?.trim();
  if (!query) return badRequest("query param is required.");

  const rawLimit = parseInt(searchParams.get("limit") ?? "12", 10);
  const limit = Math.min(Math.max(rawLimit, 1), 24);

  // ── Fetch both sources in parallel ───────────────────────────────────────
  try {
    const { meta, tiktok } = await fetchAdIntel(query, limit);
    return NextResponse.json({ meta, tiktok, available: true, query });
  } catch (err) {
    console.error("[api/ads]", err);
    return NextResponse.json({ meta: [], tiktok: [], available: false, reason: "Ad Library fetch failed" });
  }
}
