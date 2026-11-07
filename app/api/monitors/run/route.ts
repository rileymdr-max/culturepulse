import { NextRequest, NextResponse } from "next/server";
import { runAllActiveMonitors } from "@/lib/monitor-engine";

// Called by Vercel Cron every 6 hours.
// Vercel injects Authorization: Bearer {CRON_SECRET} automatically.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { ran, failed, skipped } = await runAllActiveMonitors();
    console.log(`[monitors/run] ran=${ran} failed=${failed} skipped=${skipped}`);
    return NextResponse.json({ ran, failed, skipped, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error("[monitors/run]", err);
    return NextResponse.json({ error: "Run failed" }, { status: 500 });
  }
}
