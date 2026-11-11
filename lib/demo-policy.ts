/**
 * Demo-account rules that must run in middleware (Edge runtime), so this file
 * must not import Prisma or anything Node-only. See lib/demo.ts.
 */

export const DEMO_EMAIL = "demo@culture-pulse.com";

// ─── API allowlist ────────────────────────────────────────────────────────────

/**
 * GET routes the demo may call. They only read the demo user's own rows from
 * the database. Anything else (all writes, and reads that fetch live data from
 * Apify / platform APIs) is blocked for the demo user.
 */
const DEMO_GET_ALLOWED = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/monitors$/,
  /^\/api\/briefs(\/[^/]+)?$/,
  /^\/api\/subcultures(\/[^/]+)?$/,
  /^\/api\/saved$/,
  /^\/api\/tracked$/,
  /^\/api\/billing$/,
  /^\/api\/workspaces$/,
];

export function isDemoApiAllowed(method: string, pathname: string): boolean {
  // NextAuth needs POSTs for sign-out / session refresh.
  if (pathname.startsWith("/api/auth/")) return true;
  if (method !== "GET" && method !== "HEAD") return false;
  return DEMO_GET_ALLOWED.some((re) => re.test(pathname));
}

export const DEMO_BLOCKED_CODE = "DEMO_READ_ONLY";
