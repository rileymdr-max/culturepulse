/**
 * Seed the subculture library with 25 pre-built profiles.
 * Run against the production Neon DB:
 *
 *   npm run seed:subcultures
 *
 * Loads .env.prod.local automatically.
 */

// Load .env.prod.local before importing anything that needs env vars
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
// Load prod DB credentials from .env.prod.local, but the Anthropic key there may be
// stale — force it to reload from .env (which the app uses for local dev).
loadEnvFile(".env.prod.local");
delete process.env.ANTHROPIC_API_KEY;
loadEnvFile(".env");

import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const prisma = new PrismaClient();
const anthropic = new Anthropic();

// ─── Subcultures to seed ───────────────────────────────────────────────────────
// Curated mix across categories that are most relevant to major ad agency clients.
const SUBCULTURES: { name: string; category: string; seed?: string }[] = [
  // Fashion / Lifestyle
  { name: "Sneakerheads", category: "Fashion" },
  { name: "Quiet Luxury Fashion", category: "Fashion", seed: "old money aesthetics, stealth wealth, investment dressing, Loro Piana, The Row" },
  { name: "Streetwear", category: "Fashion", seed: "Supreme, Palace, hypebeast culture, drops, grails" },
  { name: "Dark Academia", category: "Lifestyle", seed: "Oxford aesthetics, classical literature, vintage fashion, academia TikTok" },
  { name: "Cottagecore", category: "Lifestyle", seed: "rural aesthetics, foraging, slow living, baking, floral prints" },
  { name: "Clean Girl Aesthetic", category: "Beauty & Wellness", seed: "glazed donut skin, effortless minimalism, Hailey Bieber, skincare" },
  // Gaming / Tech
  { name: "PC Builders", category: "Gaming", seed: "custom PCs, RGB, watercooling, r/buildapc, benchmark culture" },
  { name: "Console Gaming Community", category: "Gaming", seed: "PlayStation, Xbox, gaming drops, competitive gaming, game releases" },
  { name: "Indie Hackers", category: "Tech", seed: "bootstrapped SaaS, build in public, MRR, ProductHunt" },
  { name: "Crypto Natives", category: "Tech", seed: "DeFi, NFT culture, Web3, on-chain, blockchain natives" },
  // Music
  { name: "Hip-Hop Culture", category: "Music", seed: "rap, trap, drill, freestyle culture, rap beef, complex" },
  { name: "Electronic / Rave Culture", category: "Music", seed: "techno, house, EDM festivals, Berlin clubs, vinyl DJs" },
  { name: "Indie Music Fans", category: "Music", seed: "Pitchfork, indie rock, bedroom pop, A24 films, Phoebe Bridgers" },
  { name: "K-Pop Fandom", category: "Music", seed: "BTS, BLACKPINK, stanning, idol culture, photocard collecting" },
  // Wellness / Health
  { name: "Biohackers", category: "Beauty & Wellness", seed: "longevity, cold plunge, HRV tracking, supplements, Andrew Huberman" },
  { name: "Plant-Based Community", category: "Beauty & Wellness", seed: "veganism, whole food plant-based, ethical eating, r/veganfitness" },
  { name: "CrossFit Community", category: "Sports", seed: "WOD, boxes, Fran, Open scores, functional fitness, CF Games" },
  { name: "Trail Running & Ultrarunning", category: "Sports", seed: "ultras, FKT, Western States, Hoka, Salomon, r/ultrarunning" },
  // Outdoors
  { name: "Van Life & Nomad Culture", category: "Outdoors", seed: "vandwellers, remote work, skoolie, boondocking, #vanlife" },
  { name: "Climbing Culture", category: "Outdoors", seed: "bouldering, sport climbing, trad, Patagonia, 8a.nu, proj" },
  // Food & Drink
  { name: "Home Coffee Culture", category: "Food & Drink", seed: "specialty coffee, espresso, V60, r/coffee, James Hoffmann, dialing in" },
  { name: "Craft Beer Enthusiasts", category: "Food & Drink", seed: "homebrewing, hazy IPAs, stout culture, Untappd, brewery tourism" },
  // Auto
  { name: "JDM Car Culture", category: "Automotive", seed: "Japanese domestic market, tuner culture, Initial D, stance, r/cars" },
  // Niche / Cross-category
  { name: "BookTok Community", category: "Entertainment", seed: "BookTok, romantasy, literary fiction, book hauls, reading challenges" },
  { name: "Vintage & Thrift Culture", category: "Fashion", seed: "thrifting, vintage Levi's, deadstock, depop, sustainable fashion" },

  // ── Batch 2: Agency-relevant additions to reach ~50 ──────────────────────────

  // Fashion / Lifestyle
  { name: "Gorpcore", category: "Fashion", seed: "Arc'teryx, Salomon trail runners as fashion, hiking-gear-as-streetwear, techwear-meets-outdoor, Gore-Tex lifestyle" },
  { name: "Y2K & Nostalgia Fashion", category: "Fashion", seed: "low-rise jeans, butterfly clips, Bratz aesthetic, Juicy Couture revival, early-2000s nostalgia, Y2K TikTok" },
  { name: "Minimalism & Intentional Living", category: "Lifestyle", seed: "Buy Nothing movement, r/minimalism, capsule wardrobe, owning less, anti-consumerism, Swedish death cleaning" },
  { name: "Sober Curious Movement", category: "Lifestyle", seed: "dry January, mindful drinking, mocktails, non-alcoholic spirits, Sober October, r/stopdrinking, Club Soda" },
  { name: "Homesteading & Self-Sufficiency", category: "Lifestyle", seed: "backyard chickens, canning, food preservation, r/homesteading, modern homestead, urban farming, off-grid adjacent" },
  { name: "Luxury Travel & Points Hacking", category: "Lifestyle", seed: "travel hacking, award booking, Amex Centurion, Chase Sapphire, Points Guy, Marriott Bonvoy, business class redemptions" },

  // Wellness / Health
  { name: "Pilates & Reformer Culture", category: "Beauty & Wellness", seed: "reformer Pilates, ClassPass, Pilates Princess, Equinox, barre, controlled movement, body sculpting aesthetic" },

  // Sports / Outdoors
  { name: "Golf Disruptors", category: "Sports", seed: "Malbon Golf, Bad Birdie, TGL, streetwear-meets-golf, Tiger Woods new era, golf content creators, hypebeast golfers" },
  { name: "Cycling & Bikepacking", category: "Sports", seed: "Rapha, Pas Normal Studios, gravel riding, Strava segments, club culture, bikepacking routes, r/cycling" },
  { name: "Surf Culture", category: "Outdoors", seed: "Vissla, Vans surf, Carver skate, dawn patrol, coastal lifestyle, surf travel, r/surfing, WSL" },
  { name: "Pickleball Community", category: "Sports", seed: "fastest growing sport, dinking, kitchen, PPA Tour, Selkirk paddles, Ben Johns, recreational pickleball culture" },

  // Gaming / Tech
  { name: "Tabletop Gaming & TTRPG", category: "Gaming", seed: "D&D, Critical Role, Dimension 20, Pathfinder, one shots, homebrew, r/DnD, miniature painting" },
  { name: "AI Builders & LLM Enthusiasts", category: "Tech", seed: "Hugging Face, LangChain, fine-tuning, r/MachineLearning, build-in-public AI, vibe coding, local LLMs, Claude, ChatGPT power users" },
  { name: "Retro Gaming Community", category: "Gaming", seed: "vintage consoles, CRT gaming, ROM hacks, r/retrogaming, GameBoy modding, Neo Geo, pixel art appreciation" },
  { name: "Mobile & Casual Gaming", category: "Gaming", seed: "Roblox adults, Candy Crush demographics, idle games, Wordle, NYT Games, gacha mechanics, mobile MOBA" },

  // Music
  { name: "Latin Music & Urbano Culture", category: "Music", seed: "reggaeton, Bad Bunny, Peso Pluma, Latin trap, corridos tumbados, Feid, Latin Grammy, Pitchfork Latin" },
  { name: "Metal & Heavy Music Community", category: "Music", seed: "metalcore revival, deathcore, prog metal, Knocked Loose, Metal Hammer, r/metal, festival circuit, moshpit culture" },

  // Food & Drink
  { name: "Natural Wine Community", category: "Food & Drink", seed: "biodynamic wine, low-intervention, pét-nat, skin contact orange wine, Resy natural wine bars, somm culture alternative" },
  { name: "Hot Sauce & Spicy Food Culture", category: "Food & Drink", seed: "Hot Ones, Heatonist, pepper collecting, Scoville obsession, homemade hot sauce, r/spicy, ghost pepper challenges" },

  // Entertainment
  { name: "Anime & Manga Fandom", category: "Entertainment", seed: "Jujutsu Kaisen, shonen, seinen, manga collecting, Crunchyroll, Funimation, con culture, figure collecting, Akihabara" },
  { name: "True Crime Community", category: "Entertainment", seed: "My Favorite Murder, Crime Junkie, Dateline, r/truecrime, cold case sleuthing, podcast Murderinos, Netflix docs" },
  { name: "Letterboxd & Film Culture", category: "Entertainment", seed: "Letterboxd lists, Criterion Collection, 4K physical media, A24 films, film Twitter, arthouse, genre film appreciation" },
  { name: "Reality TV Fandom", category: "Entertainment", seed: "Love Island, Bachelor Nation, Bravo universe, Vanderpump Rules, Real Housewives, Watch What Happens Live, live-tweeting" },

  // Automotive
  { name: "EV & Clean Transport Community", category: "Automotive", seed: "Tesla owners club, Rivian, Lucid, charging anxiety, r/electricvehicles, range anxiety solved, EV road trips" },
  { name: "Overlanding & Off-Road Culture", category: "Automotive", seed: "4Runner builds, rooftop tents, Overland Expo, overlanding rigs, recovery gear, dispersed camping, r/overlanding" },
];

// ─── Generator ────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a subcultural intelligence analyst building profiles for Speedbag — a cultural monitoring platform used by advertising agencies to identify emerging conversations before they trend mainstream.

Your job: generate a comprehensive, operationally accurate subculture profile that powers real social listening monitors. Every field must be precise enough to construct Boolean search queries.

QUALITY STANDARDS:
- Keywords + vernacular must be terms ACTUALLY USED by community members today (2024–2026), not how outsiders describe them
- Every keyword must be specific enough to filter only this subculture — no cross-contamination
- Icons, media sources, and moments must be CURRENT and REAL — no made-up names
- Categorical behaviors are NOUNS — specific objects, apps, brands, and activities they buy, collect, or interact with
- Psychographics capture the INTERNAL identity logic — how they see themselves, not how outsiders stereotype them

Always call the generate_subculture_profile tool with a complete, detailed profile.`;

const PROFILE_TOOL = {
  name: "generate_subculture_profile",
  description: "Generate a complete subculture intelligence profile",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["name","slug","description","category","keywords","vernacular","categorical_behaviors","moments","media_sources","icons","platforms","psychographics","adjacent_subcultures","brand_fit_signals"],
    properties: {
      name: { type: "string" },
      slug: { type: "string" },
      description: { type: "string" },
      category: { type: "string" },
      keywords: { type: "array", items: { type: "string" } },
      vernacular: { type: "array", items: { type: "string" } },
      categorical_behaviors: { type: "array", items: { type: "string" } },
      moments: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          required: ["name","timing","description"],
          properties: { name: { type: "string" }, timing: { type: "string" }, description: { type: "string" } },
        },
      },
      media_sources: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          required: ["name","type","description"],
          properties: { name: { type: "string" }, type: { type: "string" }, description: { type: "string" } },
        },
      },
      icons: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          required: ["name","role","sentiment"],
          properties: { name: { type: "string" }, role: { type: "string" }, sentiment: { type: "string", enum: ["revered","respected","controversial","villainized"] } },
        },
      },
      platforms: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          required: ["platform","engagement_level","content_formats"],
          properties: { platform: { type: "string" }, engagement_level: { type: "string", enum: ["primary","secondary","minimal"] }, content_formats: { type: "array", items: { type: "string" } } },
        },
      },
      psychographics: {
        type: "object", additionalProperties: false,
        required: ["hero","villain","core_values","motivations"],
        properties: { hero: { type: "string" }, villain: { type: "string" }, core_values: { type: "array", items: { type: "string" } }, motivations: { type: "array", items: { type: "string" } } },
      },
      adjacent_subcultures: { type: "array", items: { type: "string" } },
      brand_fit_signals: {
        type: "object", additionalProperties: false,
        required: ["fit_industries","red_flags"],
        properties: { fit_industries: { type: "array", items: { type: "string" } }, red_flags: { type: "array", items: { type: "string" } } },
      },
    },
  },
};

async function generateOne(name: string, seed?: string) {
  const stream = anthropic.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    tools: [PROFILE_TOOL as unknown as Anthropic.Tool],
    messages: [{
      role: "user",
      content: `Generate a complete subculture profile for: ${name}${seed ? `\n\nContext: ${seed}` : ""}`,
    }],
  });
  const response = await stream.finalMessage();
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error(`No tool call for ${name}`);
  return toolUse.input as Record<string, unknown>;
}

async function saveProfile(profile: Record<string, unknown>) {
  return prisma.subculture.upsert({
    where: { slug: profile.slug as string },
    update: {},
    create: {
      slug: profile.slug as string,
      name: profile.name as string,
      description: profile.description as string,
      category: profile.category as string,
      status: "approved",
      keywords: profile.keywords as string[],
      vernacular: profile.vernacular as string[],
      categoricalBehaviors: profile.categorical_behaviors as string[],
      moments: profile.moments as object[],
      mediaSources: profile.media_sources as object[],
      icons: (profile.icons as object[] | undefined) ?? [],
      platforms: (profile.platforms as object[] | undefined) ?? [],
      psychographics: (profile.psychographics as object | undefined) ?? { hero: "", villain: "", core_values: [], motivations: [] },
      adjacentSubcultures: (profile.adjacent_subcultures as string[] | undefined) ?? [],
      brandFitSignals: (profile.brand_fit_signals as object | undefined) ?? { fit_industries: [], red_flags: [] },
      generatedByAi: true,
    },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${SUBCULTURES.length} subcultures...\n`);

  let created = 0;
  let skipped = 0;

  for (const { name, seed } of SUBCULTURES) {
    // Skip if already exists
    const existing = await prisma.subculture.findFirst({ where: { name } });
    if (existing) {
      console.log(`  ⏭  ${name} (exists)`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ⏳ ${name}...`);
    try {
      const profile = await generateOne(name, seed);
      const saved = await saveProfile(profile);
      console.log(` ✓ saved (${saved.id})`);
      created++;
    } catch (err) {
      console.log(` ✗ FAILED: ${err}`);
    }

    // Small pause between requests to avoid hammering the API
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
