/**
 * Seed 5 example content briefs — one per category — from seeded subcultures.
 * Run after seed-subcultures.ts:
 *
 *   npm run seed:briefs
 *
 * Loads .env.prod.local automatically.
 * Briefs are attributed to the first user in the DB.
 */

// Load .env.prod.local before importing anything that needs env vars
import { readFileSync } from "fs";
import { resolve } from "path";
try {
  const envPath = resolve(process.cwd(), ".env.prod.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch { /* env file not found — rely on existing env */ }

import { PrismaClient } from "@prisma/client";
import { generateContentBrief } from "../lib/content-intelligence";

const prisma = new PrismaClient();

// ─── Subcultures to generate example briefs for ───────────────────────────────
// Picking across categories that showcase the breadth of the platform.
const TARGET_SLUGS = [
  "sneakerheads",          // Fashion — high energy, drops culture
  "quiet-luxury-fashion",  // Fashion — premium, understated
  "pc-builders",           // Tech/Gaming — high-intent, product-driven
  "biohackers",            // Wellness — trend-accelerating space
  "hip-hop-culture",       // Music — high cultural velocity
];

async function main() {
  // Find the seed user (first user in DB — the account used for demos)
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    console.error("No users found in DB. Register at the app first, then run this script.");
    process.exit(1);
  }
  console.log(`Generating briefs for user: ${user.email}\n`);

  let created = 0;
  let skipped = 0;

  for (const slug of TARGET_SLUGS) {
    const subculture = await prisma.subculture.findUnique({ where: { slug } });
    if (!subculture) {
      console.log(`  ⚠  ${slug} not found in DB — run seed:subcultures first`);
      skipped++;
      continue;
    }

    // Skip if a brief already exists for this user + subculture
    const existing = await prisma.contentBrief.findFirst({
      where: { userId: user.id, subcultureId: subculture.id },
    });
    if (existing) {
      console.log(`  ⏭  ${subculture.name} (brief exists)`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ⏳ Generating brief for ${subculture.name}...`);
    try {
      const generated = await generateContentBrief(subculture);

      await prisma.contentBrief.create({
        data: {
          userId: user.id,
          subcultureId: subculture.id,
          monitorId: null,
          headline: generated.headline,
          urgency: generated.urgency,
          momentSummary: generated.moment_summary,
          accelerationContext: generated.acceleration_context,
          contentAngles: generated.content_angles as object[],
          platformStrategy: generated.platform_strategy as object[],
          brandFit: generated.brand_fit as object,
          velocityAtGeneration: null,
        },
      });

      console.log(` ✓ "${generated.headline}"`);
      created++;
    } catch (err) {
      console.log(` ✗ FAILED: ${err}`);
    }

    // Small pause between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
