/**
 * TikTok live API connector — STUB (mock passthrough).
 *
 * ─── WHY THIS IS A STUB ────────────────────────────────────────────────────────
 * The TikTok Research API (https://developers.tiktok.com/products/research-api/)
 * is restricted to academic and approved research institutions. Commercial
 * access to hashtag/video data requires a separate partnership agreement.
 *
 * TikTok's Display API was deprecated in 2023. The Content Posting API
 * does not support data retrieval. There is no public API equivalent to
 * Reddit's subreddit search or X's tweets/search endpoint.
 *
 * ─── HOW TO CONNECT THE REAL API WHEN APPROVED ────────────────────────────────
 *
 * 1. Apply at: https://developers.tiktok.com/products/research-api/
 *    (Institution email required; approval takes 2-4 weeks.)
 *
 * 2. Once approved, set these environment variables:
 *      TIKTOK_CLIENT_KEY    — from the TikTok Developer Portal
 *      TIKTOK_CLIENT_SECRET — from the TikTok Developer Portal
 *
 * 3. Authentication flow (OAuth 2.0 client credentials):
 *    POST https://open.tiktokapis.com/v2/oauth/token/
 *    Body: client_key, client_secret, grant_type=client_credentials
 *    → Returns: access_token (valid for 2 hours)
 *
 * 4. Key Research API endpoints:
 *    POST /v2/research/video/query/       — search videos by keyword/hashtag
 *    POST /v2/research/user/info/         — user profile data
 *    POST /v2/research/hashtag/query/     — hashtag metadata
 *
 * 5. Replace the functions below with real fetch calls using those endpoints.
 *    The mock data already returns the correct CommunityData schema, so the
 *    only change needed is the data source.
 *
 * 6. Typical rate limits: 1,000 requests/day for research API.
 *    Cache aggressively — the CommunityCache Prisma model is built for this.
 *
 * ─── EXAMPLE REAL IMPLEMENTATION ─────────────────────────────────────────────
 *
 * async function getTikTokToken(): Promise<string> {
 *   const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/x-www-form-urlencoded" },
 *     body: new URLSearchParams({
 *       client_key: process.env.TIKTOK_CLIENT_KEY!,
 *       client_secret: process.env.TIKTOK_CLIENT_SECRET!,
 *       grant_type: "client_credentials",
 *     }),
 *   });
 *   const data = await res.json();
 *   return data.access_token;
 * }
 *
 * async function searchHashtag(query: string, token: string) {
 *   const res = await fetch("https://open.tiktokapis.com/v2/research/hashtag/query/", {
 *     method: "POST",
 *     headers: {
 *       Authorization: `Bearer ${token}`,
 *       "Content-Type": "application/json",
 *     },
 *     body: JSON.stringify({ hashtag_name: query }),
 *   });
 *   return res.json();
 * }
 */

import type { CommunityData, PlatformSearchResult } from "../types";
import { mockTikTokSearch, mockGetTikTokCommunity } from "./mock";

/**
 * Live TikTok search — currently passes through to mock.
 * Replace the body of this function once Research API access is granted.
 */
export async function liveTikTokSearch(query: string): Promise<PlatformSearchResult> {
  // TODO: Replace with real Research API call when access is approved.
  // See the documentation at the top of this file for implementation steps.
  console.info("[tiktok] Research API not yet connected — using mock data.");
  return mockTikTokSearch(query);
}

/**
 * Live TikTok community fetch — currently passes through to mock.
 */
export async function liveGetTikTokCommunity(communityId: string): Promise<CommunityData | null> {
  // TODO: Replace with real Research API call when access is approved.
  console.info("[tiktok] Research API not yet connected — using mock data.");
  return mockGetTikTokCommunity(communityId);
}
