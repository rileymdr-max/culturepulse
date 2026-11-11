/**
 * Automatic monitor runs (Vercel Cron, every 6 hours at :00 UTC).
 *
 * PAUSED during the build phase (2026-11-11) to save Apify credit: monitors
 * only run when someone clicks "Run all now" or a card's run button.
 *
 * TODO before launch: set this back to true. The cron entry in vercel.json
 * stays in place, so flipping this flag is the only change needed.
 */
export const MONITOR_AUTO_RUN = false;

/** Shown wherever the app tells users how often monitors refresh. */
export const MONITOR_REFRESH_COPY = MONITOR_AUTO_RUN
  ? "monitors refresh every 6 hours"
  : "monitors refresh when you click Run all now on the Signal Board";
