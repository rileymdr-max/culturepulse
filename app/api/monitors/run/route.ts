import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cron-auth";
import { runAllActiveMonitors } from "@/lib/monitor-engine";

// Called by Vercel Cron every 6 hours for every user's monitors.
// Vercel injects Authorization: Bearer {CRON_SECRET} automatically.
// The Signal Board's "Run all now" uses /api/monitors/run-mine instead.
export const maxDuration = 300;
// Never prerender: this route sends emails / runs scrapers and must only run when called.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = rejectUnlessCron(req);
  if (denied) return denied;

  try {
    const summary = await runAllActiveMonitors();
    return NextResponse.json({ ...summary, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error("[monitors/run]", err);
    return NextResponse.json({ error: "Run failed" }, { status: 500 });
  }
}
