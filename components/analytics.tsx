"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Web Analytics + Speed Insights (cookieless; only collect on Vercel deployments).
 * Query strings are stripped before sending so search terms and invite tokens
 * in URLs never reach analytics.
 */
function stripQuery<T extends { url: string }>(event: T): T {
  try {
    const url = new URL(event.url);
    url.search = "";
    return { ...event, url: url.toString() };
  } catch {
    return event;
  }
}

export function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={(event: BeforeSendEvent) => stripQuery(event)} />
      <SpeedInsights beforeSend={(data) => stripQuery(data)} />
    </>
  );
}
