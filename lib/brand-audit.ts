/**
 * Brand Subculture Audit
 *
 * Pipeline:
 *   1. Scrape the brand's social presence via getLiveAudience (Apify)
 *   2. Format community + topic signals into a structured prompt
 *   3. Call Claude to map signals → known subcultures + newly discovered ones
 *   4. Return BrandAuditResult
 *
 * Falls back to realistic mock data if Apify or Claude are unavailable.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getLiveAudience } from "./platforms/audience-live";
import { getMockAudience } from "./platforms/audience";
import type { BrandAuditResult, MatchedSubculture, DiscoveredSubculture } from "./types/brand-audit";
import type { AudienceResult, HandleMap } from "./platforms/audience";

const client = new Anthropic();

// ─── Tool schema ──────────────────────────────────────────────────────────────

const AUDIT_TOOL: Anthropic.Tool = {
  name: "brand_subculture_audit",
  description: "Return a complete subculture audit for a brand's social audience",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: [
      "audience_summary",
      "matched_subcultures",
      "discovered_subcultures",
      "primary_platforms",
      "dominant_themes",
    ],
    properties: {
      audience_summary: {
        type: "string" as const,
        description: "2–3 sentence summary of this brand's audience identity and cultural positioning",
      },
      matched_subcultures: {
        type: "array" as const,
        description: "5–8 subcultures from the established cultural landscape that this audience clearly belongs to",
        items: {
          type: "object" as const,
          additionalProperties: false,
          required: ["name", "slug", "category", "match_pct", "match_strength", "why", "key_signals"],
          properties: {
            name: { type: "string" as const, description: "Subculture name, e.g. 'Quiet Luxury Fashion'" },
            slug: { type: "string" as const, description: "URL-safe lowercase slug, e.g. 'quiet-luxury-fashion'" },
            category: { type: "string" as const, description: "e.g. Fashion, Gaming, Wellness, Outdoor, Music, Food, Tech" },
            match_pct: { type: "number" as const, description: "Signal match strength 1–100; be realistic, not flattering" },
            match_strength: { type: "string" as const, enum: ["strong", "moderate", "emerging"] },
            why: { type: "string" as const, description: "1–2 sentence explanation of what drove this match" },
            key_signals: {
              type: "array" as const,
              items: { type: "string" as const },
              description: "3–5 specific hashtags, communities, or topics that drove the match",
            },
          },
        },
      },
      discovered_subcultures: {
        type: "array" as const,
        description: "2–3 emerging cultural clusters revealed by the signals that don't yet have an established profile",
        items: {
          type: "object" as const,
          additionalProperties: false,
          required: ["name", "provisional_slug", "description", "estimated_audience_pct", "key_signals", "why_new", "suggested_category"],
          properties: {
            name: { type: "string" as const, description: "Provisional name for this emerging subculture" },
            provisional_slug: { type: "string" as const },
            description: { type: "string" as const, description: "2–3 sentence description of this subculture's identity, values, and behaviors" },
            estimated_audience_pct: { type: "number" as const, description: "Estimated % of this brand's audience that belongs to this group" },
            key_signals: { type: "array" as const, items: { type: "string" as const }, description: "4–6 signals that reveal this subculture" },
            why_new: { type: "string" as const, description: "Why this doesn't fit into any existing well-known subculture" },
            suggested_category: { type: "string" as const },
          },
        },
      },
      primary_platforms: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "2–4 platforms where this audience is most culturally active",
      },
      dominant_themes: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "5–7 overarching cultural themes that unite this audience",
      },
    },
  },
};

// ─── Signal formatter ─────────────────────────────────────────────────────────

function formatSignals(handle: string, audience: AudienceResult): string {
  // Group communities by platform so Claude sees a balanced view
  const byPlatform = new Map<string, typeof audience.communities>();
  for (const c of audience.communities) {
    const bucket = byPlatform.get(c.platform) ?? [];
    bucket.push(c);
    byPlatform.set(c.platform, bucket);
  }

  const platformSections = Array.from(byPlatform.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([platform, communities]) => {
      const lines = communities
        .slice(0, 4)
        .map((c) => `    • ${c.community_name} — ${c.overlap_pct}% overlap — Topics: ${c.shared_topics.join(", ")}`)
        .join("\n");
      return `  ${platform.toUpperCase()}:\n${lines}`;
    })
    .join("\n\n");

  const allTopics = audience.communities.flatMap((c) => c.shared_topics);
  const topicCounts: Record<string, number> = {};
  for (const t of allTopics) topicCounts[t] = (topicCounts[t] ?? 0) + 1;
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([t]) => t)
    .join(", ");

  const platformList = Array.from(byPlatform.entries())
    .map(([p, cs]) => `${p} (${cs.length} communities)`)
    .join(", ");

  return `BRAND: @${handle}
ESTIMATED AUDIENCE: ${audience.estimated_total_audience.toLocaleString()}
PLATFORMS WITH DATA: ${platformList}

AUDIENCE COMMUNITIES BY PLATFORM (each platform weighted equally):
${platformSections}

CROSS-PLATFORM TOPIC SIGNALS: ${topTopics}`;
}

// ─── Claude analysis ──────────────────────────────────────────────────────────

async function analyzeWithClaude(
  handle: string,
  audience: AudienceResult
): Promise<Omit<BrandAuditResult, "brand_handle" | "platform" | "audience_size" | "analyzed_at" | "live">> {
  const signals = formatSignals(handle, audience);

  const response = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    tools: [AUDIT_TOOL],
    tool_choice: { type: "auto" },
    system: `You are CulturePulse — a cultural intelligence analyst who maps brand audiences to their subculture identities.

Your job: analyze a brand's audience signals and produce a precise, insightful subculture audit.

PLATFORM BALANCE (critical): Data is provided per platform. Weight each platform's signals equally regardless of data volume. Twitter/X has seen a significant user decline since 2022 — do NOT let Twitter communities dominate your analysis. Instagram and TikTok now carry more cultural weight for most consumer brands. If TikTok, Instagram, or Reddit signals are present, they should drive at least half your subculture matches.

GENERIC DEFAULTS TO AVOID: "AI entrepreneurs", "tech bros", "indie hackers", "startup culture", and similar tech-Twitter archetypes should only appear if the brand's Instagram/TikTok/Reddit signals strongly support them — NOT because they appear in Twitter data. These are overfit patterns that show up in nearly every audit when Twitter is over-weighted. Push past them.

MATCHED SUBCULTURES (5–8): Identify established cultural segments this audience clearly belongs to. Draw from the full cultural landscape: fashion aesthetics (quiet luxury, dark academia, streetwear, clean girl, cottagecore, gorpcore, old money), wellness/lifestyle (biohackers, slow living, plant-based, fitness culture, raw wellness), gaming/digital (gamers, speedrunners, cozy gamers, esports fans), outdoor/adventure (van life, trail runners, surfers, ski bums, wild swimmers), music/arts (indie heads, hyperpop, vinyl collectors, bedroom pop), food culture (home chefs, fermenters, restaurant hoppers, deli maximalists), beauty (skintellectuals, glass skin, clean beauty, maximalist makeup), and beyond. Be specific to this brand — no two brands should share the same list.

DISCOVERED SUBCULTURES (2–3): Surface emerging cultural clusters the signals reveal that haven't been formally catalogued. Look for unusual signal combinations that cross traditional category lines, micro-niches unique to this brand's audience, and hybrid identities forming at the intersection of multiple communities.

Match percentages must be realistic and vary significantly — not everything is 70%+. A strong match for a niche subculture is more valuable than a weak match to a broad one.`,
    messages: [
      {
        role: "user",
        content: `Analyze this brand's audience and return a complete subculture audit:\n\n${signals}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a brand audit — check model and tool definition");
  }

  const result = toolUse.input as {
    audience_summary: string;
    matched_subcultures: MatchedSubculture[];
    discovered_subcultures: DiscoveredSubculture[];
    primary_platforms: string[];
    dominant_themes: string[];
  };

  return result;
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

function getMockAudit(handle: string): BrandAuditResult {
  const h = handle.toLowerCase();
  // Seed variation so different handles feel distinct
  const seed = h.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const v = <T,>(a: T, b: T): T => (seed % 2 === 0 ? a : b);

  return {
    brand_handle: `@${handle}`,
    platform: "all",
    audience_size: 284_000 + (seed % 500_000),
    audience_summary: `@${handle}'s audience clusters strongly around ${v("aspirational aesthetics and self-improvement culture", "outdoor adventure and performance lifestyle")}, with a secondary layer of ${v("digital-native creatives who blend work and identity", "community-driven wellness seekers who document their journey")}. The audience skews toward platforms where visual storytelling and community ritual overlap — suggesting a cohort that uses consumption as both identity expression and social currency.`,
    matched_subcultures: [
      {
        name: v("Quiet Luxury Fashion", "Elevated Outdoor Culture"),
        slug: v("quiet-luxury-fashion", "elevated-outdoor-culture"),
        category: "Fashion",
        match_pct: 67,
        match_strength: "strong",
        why: v(
          "Heavy overlap with communities centered on understated quality, old-money aesthetics, and investment dressing. The audience consistently engages with vocabulary like 'stealth wealth' and 'quiet confidence.'",
          "Strong signal from communities organized around performance gear, trail culture, and the intersection of functionality and style. The audience engages with both technical specs and aesthetic presentation."
        ),
        key_signals: v(
          ["#quietluxury", "#oldmoney", "r/femalefashionadvice", "stealth wealth", "investment pieces"],
          ["#trailrunning", "#gorpcore", "r/ultralight", "technical fabrics", "FKT"]
        ),
      },
      {
        name: "Clean Girl Aesthetic",
        slug: "clean-girl-aesthetic",
        category: "Beauty & Wellness",
        match_pct: 54,
        match_strength: "strong",
        why: "Consistent engagement with skincare, minimalist beauty routines, and wellness content. The audience values effortless-looking results and authenticity over heavy styling.",
        key_signals: ["#cleangirl", "#skincarejourney", "#glassskin", "FitTok", "wellness routine"],
      },
      {
        name: v("Biohacking & Optimization", "Van Life & Nomad Culture"),
        slug: v("biohacking-optimization", "van-life-nomad"),
        category: "Wellness",
        match_pct: 41,
        match_strength: "moderate",
        why: v(
          "Signals from productivity, supplement stacking, and performance tracking communities. This audience treats the body as a system to optimize and documents the process publicly.",
          "Strong subreddit overlap with #vandwellers, remote work communities, and adventure travel. The audience idealizes freedom from fixed geography and built environments."
        ),
        key_signals: v(
          ["#biohacking", "r/longevity", "cold plunge", "sleep tracking", "HRV"],
          ["#vanlife", "r/vandwellers", "remote work", "#dirtbag", "off-grid"]
        ),
      },
      {
        name: "Indie Maker / Build in Public",
        slug: "indie-maker-build-in-public",
        category: "Tech",
        match_pct: 38,
        match_strength: "moderate",
        why: "Meaningful presence in indie hacker, bootstrapper, and creator economy communities. This segment treats side projects as identity and uses public documentation as audience-building.",
        key_signals: ["r/indiehackers", "#buildinpublic", "ProductHunt", "bootstrapped", "MRR updates"],
      },
      {
        name: "Cottagecore / Slow Living",
        slug: "cottagecore-slow-living",
        category: "Lifestyle",
        match_pct: 29,
        match_strength: "moderate",
        why: "Secondary but distinct cluster engaging with foraging, home preservation, analog hobbies, and rural aesthetics. Functions as a counterweight to the audience's tech-forward segments.",
        key_signals: ["#cottagecore", "#slowliving", "sourdough", "r/homesteading", "seasonal eating"],
      },
      {
        name: "Sports & Athletic Identity",
        slug: "sports-athletic-identity",
        category: "Sports",
        match_pct: 24,
        match_strength: "emerging",
        why: "Emerging signal from communities organized around athletic performance as lifestyle, not just fitness. This group treats sports participation as central to their social identity.",
        key_signals: ["#athleticlifestyle", "FitTok", "race day", "training log", "#runnerscommunity"],
      },
      {
        name: "Plant-Based & Conscious Consumer",
        slug: "plant-based-conscious-consumer",
        category: "Food & Wellness",
        match_pct: 19,
        match_strength: "emerging",
        why: "Emerging overlap with sustainability, ethical sourcing, and plant-based diet communities. Present but not dominant — likely a values-aligned secondary identity for a portion of the core audience.",
        key_signals: ["#plantbased", "#sustainableliving", "r/veganfitness", "ethical brands", "#consciousliving"],
      },
    ],
    discovered_subcultures: [
      {
        name: v("Aesthetic Functionalism", "Purposeful Minimalism"),
        provisional_slug: v("aesthetic-functionalism", "purposeful-minimalism"),
        description: v(
          "A hybrid subculture at the intersection of industrial design appreciation, performance gear culture, and minimal aesthetics. Members obsessively curate objects that are both beautiful and built for a purpose — their identity is expressed through tools, not decoration. Think: Muji pens, Arc'teryx softshells, standing desks, and carefully chosen everyday-carry setups.",
          "An emerging cluster whose members have rejected both maximalism and ascetic austerity in favor of objects and spaces that signal intentionality. Not minimalism as deprivation — minimalism as precision. They spend significantly on fewer things and document the curation process as a form of self-expression."
        ),
        estimated_audience_pct: 23,
        key_signals: v(
          ["EDC community", "#functionaldesign", "r/BuyItForLife", "material quality", "object photography"],
          ["#intentionalliving", "capsule wardrobe", "r/minimalism", "quality over quantity", "fewer better things"]
        ),
        why_new: v(
          "Doesn't fit cleanly into 'minimalism' (too performance-oriented) or 'outdoor culture' (too design-focused) or 'quiet luxury' (too utilitarian). The defining identity logic — 'beautiful because functional' — is distinct enough to constitute its own subculture.",
          "Unlike traditional minimalism (which skews toward self-denial) or quiet luxury (which skews toward status), this group's identity centers on decision quality and long-term value. The cultural vocabulary and community structures are genuinely distinct."
        ),
        suggested_category: "Lifestyle",
      },
      {
        name: "Digital Homesteader",
        provisional_slug: "digital-homesteader",
        description: "A newly emergent hybrid combining the self-sufficiency ethos of homesteading culture with the documentation habits and monetization instincts of digital creators. They make sourdough and also have a newsletter about it. They preserve vegetables and also have a YouTube channel. The defining behavior: treating analog skills as content IP while genuinely believing in the underlying practices.",
        estimated_audience_pct: 15,
        key_signals: ["homesteading content", "#fromtheground", "fermentation tutorials", "newsletter about foraging", "analog + digital hybrid content"],
        why_new: "Traditional homesteaders reject the digital economy; traditional creators reject the analog. This subculture sits squarely at the intersection — their identity only makes sense if both halves are present. No existing profile captures this specific identity formation.",
        suggested_category: "Lifestyle",
      },
    ],
    primary_platforms: ["TikTok", "Instagram", "Reddit", "Substack"],
    dominant_themes: ["identity through curation", "analog resurgence", "performance as lifestyle", "anti-generic aesthetics", "intentional consumption", "community as validation"],
    analyzed_at: new Date().toISOString(),
    live: false,
    fallback: true,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runBrandAudit(
  handles: HandleMap,
  platform: "all" | "twitter" | "instagram" | "tiktok" | "reddit" | "youtube" | "pinterest" = "all",
  excludedPlatforms: string[] = []
): Promise<BrandAuditResult> {
  const normalized = handles.default.replace(/^[@u\/]+/, "").toLowerCase();
  const useApify = !!process.env.APIFY_API_TOKEN && process.env.FORCE_MOCK_DATA !== "true";

  // Step 1: get audience signals
  let audience: AudienceResult;
  let gotLiveAudience = false;

  try {
    audience = useApify
      ? await getLiveAudience(handles, platform, excludedPlatforms)
      : getMockAudience(normalized, platform);
    gotLiveAudience = useApify;
  } catch (err) {
    console.warn("[brand-audit] Audience scrape failed, using mock:", err);
    audience = getMockAudience(normalized, platform);
  }

  // Step 2: Claude analysis
  if (!process.env.ANTHROPIC_API_KEY) {
    return getMockAudit(normalized);
  }

  try {
    const analysis = await analyzeWithClaude(normalized, audience);
    return {
      brand_handle: `@${normalized}`,
      platform,
      audience_size: audience.estimated_total_audience,
      analyzed_at: new Date().toISOString(),
      live: gotLiveAudience,
      ...analysis,
    };
  } catch (err) {
    console.warn("[brand-audit] Claude analysis failed, using mock:", err);
    return getMockAudit(normalized);
  }
}
