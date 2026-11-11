/**
 * Apify REST API client.
 * Runs actors synchronously and returns dataset items.
 */

const APIFY_BASE = "https://api.apify.com/v2";

/**
 * Runs an Apify actor synchronously and returns the result items.
 * Falls back to an empty array on timeout or error — callers should
 * handle empty results by falling back to mock data.
 *
 * @param actorId    - e.g. "apify/twitter-scraper"
 * @param input      - Actor-specific input object
 * @param timeoutSecs - Max seconds to wait for the run (default 60)
 * @param memoryMb   - Actor memory in MB (default 256)
 */
export async function runActor<T = Record<string, unknown>>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 60,
  memoryMb = 256
): Promise<T[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured");

  const url =
    `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items` +
    `?token=${token}&timeout=${timeoutSecs}&memory=${memoryMb}&format=json`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    // Abort a bit after the Apify timeout so we don't hang the route handler
    signal: AbortSignal.timeout((timeoutSecs + 15) * 1000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // A timed-out run has usually saved some items already (TikTok pushes
    // videos as it goes). Keep those instead of losing the platform this run.
    const runId = /TIMED-OUT/.test(text) ? text.match(/run ID: ([A-Za-z0-9]+)/)?.[1] : undefined;
    if (runId) {
      const partial = await fetch(
        `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${token}&format=json&clean=true`,
        { signal: AbortSignal.timeout(15_000) }
      )
        .then((r) => (r.ok ? (r.json() as Promise<T[]>) : []))
        .catch(() => [] as T[]);
      if (partial.length > 0) {
        console.warn(`[apify] ${actorId} timed out; using ${partial.length} partial results`);
        return partial;
      }
    }
    throw new Error(`Apify error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T[]>;
}
