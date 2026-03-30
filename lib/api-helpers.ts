/**
 * Shared utilities for Next.js API route handlers.
 * Provides: session guard, standardised error responses, and rate limiting.
 */

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";

// ─── Session guard ────────────────────────────────────────────────────────────

/**
 * Retrieves the current session. Returns a 401 response if unauthenticated.
 * Use in route handlers:
 *
 *   const { session, error } = await requireSession();
 *   if (error) return error;
 */
export async function requireSession(): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

// ─── Standardised error responses ────────────────────────────────────────────

export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error"): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function tooManyRequests(retryAfterSeconds = 60): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────
//
// Uses Upstash Redis (sliding window) when UPSTASH_REDIS_REST_URL is configured.
// Falls back to a simple in-memory sliding-window counter for local dev.
// The public API (enforceRateLimit) is identical in both cases — no route changes needed.

// ── In-memory fallback ────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function inMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true };
}

// ── Upstash Redis sliding-window ──────────────────────────────────────────────
//
// Lazily initialised so the import only runs on the server and only when the
// env vars are present.  The @upstash/ratelimit package is an optional dep —
// if it's not installed the in-memory fallback is used automatically.

type UpstashResult = { allowed: true } | { allowed: false; retryAfter: number };

async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<UpstashResult | null> {
  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return null;

  try {
    // Dynamic import keeps this tree-shakeable and avoids hard dependency
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import("@upstash/ratelimit"),
      import("@upstash/redis"),
    ]);

    const redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${Math.round(windowMs / 1000)} s`),
      prefix: "culturepulse",
    });

    const { success, reset } = await ratelimit.limit(key);
    if (success) return { allowed: true };

    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  } catch (err) {
    // If Upstash is misconfigured or the package isn't installed, degrade gracefully
    console.warn("[rate-limit] Upstash unavailable, falling back to in-memory:", err);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Checks whether a given key has exceeded the allowed request rate.
 * Tries Upstash first; falls back to in-memory.
 *
 * @param key      - Usually `userId:routeName`, e.g. "abc123:search"
 * @param limit    - Max requests allowed in the window (default 20)
 * @param windowMs - Rolling window duration in ms (default 60s)
 */
export async function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const upstash = await upstashRateLimit(key, limit, windowMs);
  if (upstash !== null) return upstash;
  return inMemoryRateLimit(key, limit, windowMs);
}

/**
 * Convenience wrapper: checks rate limit and returns a 429 response if exceeded.
 * Returns null if allowed.
 *
 * @param req    - The incoming request
 * @param userId - Authenticated user ID
 * @param route  - Route identifier (e.g. "search")
 * @param limit  - Max requests per 60-second window
 */
export async function enforceRateLimit(
  req: NextRequest,
  userId: string,
  route: string,
  limit = 20
): Promise<NextResponse | null> {
  const key = `${userId}:${route}`;
  const result = await checkRateLimit(key, limit);
  if (!result.allowed) {
    return tooManyRequests(result.retryAfter);
  }
  return null;
}
