import { NextRequest, NextResponse } from "next/server";

/**
 * Guards scheduled-job routes. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * - If CRON_SECRET is set, the header must match.
 * - If it isn't set, production fails closed (refuse every call) so a missing
 *   secret can never leave email or paid scraping open to the public.
 *   Local development and previews still allow calls for testing.
 * Returns a response to send back when the call is not allowed, otherwise null.
 */
export function rejectUnlessCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.VERCEL_ENV === "production") {
      console.error("[cron] CRON_SECRET is not configured; refusing scheduled-job call");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }

  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
