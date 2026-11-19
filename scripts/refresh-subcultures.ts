/**
 * Refresh approved library profiles with live scraped data (all six sources),
 * then let Claude update each profile against that evidence. Profiles get the
 * "Live data" tag and a live snapshot on their page.
 *
 *   npm run refresh:subcultures -- --list              # show search phrases, no cost
 *   npm run refresh:subcultures -- --only=sneakerheads # one profile
 *   npm run refresh:subcultures                        # all not refreshed in 30 days
 *
 * Flags: --only=slug[,slug]  --limit=N  --days=N (skip if refreshed within N days, default 30)
 *        --all (ignore --days)  --dry-run (scrape + Claude, but don't save)  --list
 *        --snapshot-only (new Live snapshot, keep the profile text)  --new-plan (rebuild the search plan)
 *
 * Loads .env.prod.local (production DB + Apify), Anthropic key from .env.
 * Cost: roughly $0.20–0.40 Apify + one Claude call per profile.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
function loadEnvFile(filename: string) {
  try {
    const lines = readFileSync(resolve(process.cwd(), filename), "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch { /* file not found — skip */ }
}
loadEnvFile(".env.prod.local");
delete process.env.ANTHROPIC_API_KEY;
loadEnvFile(".env");
// Live scrapes only — never store mock data as "Live data".
process.env.FORCE_MOCK_DATA = "false";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const value = (name: string) => flag(name)?.split("=")[1];

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { refreshLibraryProfile, searchPhraseFor } = await import("../lib/subculture-refresh");

  const only = value("only")?.split(",").map((s) => s.trim()).filter(Boolean);
  const limit = value("limit") ? Number(value("limit")) : undefined;
  const days = flag("all") ? 0 : Number(value("days") ?? 30);
  const cutoff = new Date(Date.now() - days * 86_400_000);

  const rows = await prisma.subculture.findMany({
    where: { status: "approved", ...(only ? { slug: { in: only } } : {}) },
    orderBy: { name: "asc" },
  });

  const due = rows.filter((r) => {
    if (only || days === 0 || !r.enrichedByApify) return true;
    const sd = r.signalData as { enriched_at?: string; window_days?: number } | null;
    // Snapshots from before the 14-day window are always due.
    if (!sd?.window_days) return true;
    return !sd.enriched_at || new Date(sd.enriched_at) < cutoff;
  }).slice(0, limit);

  if (flag("list")) {
    for (const r of due) console.log(`${r.enrichedByApify ? "●" : "○"} ${r.name.padEnd(36)} → "${searchPhraseFor(r.slug, r.name)}"  (${r.slug})`);
    console.log(`\n${due.length} of ${rows.length} approved profiles due.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Refreshing ${due.length} profile(s)${flag("dry-run") ? " (dry run — nothing saved)" : ""}...\n`);
  let ok = 0, failed = 0;
  const failures: string[] = [];

  // Two at a time: each scrape takes up to ~90s, and Apify/Claude both cope fine.
  const queue = [...due];
  async function worker() {
    for (let r = queue.shift(); r; r = queue.shift()) {
      const started = Date.now();
      try {
        const res = await refreshLibraryProfile(r, { dryRun: !!flag("dry-run"), newPlan: !!flag("new-plan"), snapshotOnly: !!flag("snapshot-only") });
        const secs = Math.round((Date.now() - started) / 1000);
        if (res.ok) { ok++; console.log(`  ✓ ${r.name} — ${res.sources.join(", ")} (${secs}s)`); }
        else { failed++; failures.push(`${r.name}: ${res.reason}`); console.log(`  – ${r.name} — skipped: ${res.reason}`); }
      } catch (err) {
        failed++;
        failures.push(`${r.name}: ${String(err).slice(0, 200)}`);
        console.log(`  ✗ ${r.name} — ${String(err).slice(0, 200)}`);
      }
    }
  }
  await Promise.all([worker(), worker()]);

  console.log(`\nDone. Refreshed: ${ok}, skipped/failed: ${failed}`);
  if (failures.length) console.log("Not refreshed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
