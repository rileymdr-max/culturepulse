import Anthropic from "@anthropic-ai/sdk";
import type { SubcultureProfile } from "./types/subculture";

const SYSTEM_PROMPT = `You are a subcultural intelligence analyst building profiles for Speedbag — a cultural monitoring platform used by advertising agencies to identify emerging conversations before they trend mainstream.

Your job: generate a comprehensive, operationally accurate subculture profile that powers real social listening monitors. Every field must be precise enough to construct Boolean search queries.

QUALITY STANDARDS:
- Keywords + vernacular must be terms ACTUALLY USED by community members today (2024–2026), not how outsiders describe them
- Every keyword must be specific enough to filter only this subculture — no cross-contamination
- Icons, media sources, and moments must be CURRENT and REAL — no made-up names
- Categorical behaviors are NOUNS — specific objects, apps, brands, and activities they buy, collect, or interact with
- Psychographics capture the INTERNAL identity logic — how they see themselves, not how outsiders stereotype them

WHAT MAKES A GREAT PROFILE:
- Keywords/vernacular only someone inside the subculture would use
- Moments that are actual conversation triggers (a game release, a fashion week, a rivalry, an annual event)
- Icons the community actually debates — both heroes and villains
- Brand fit signals that reflect genuine cultural compatibility, not just demographic overlap

Always call the generate_subculture_profile tool with a complete, detailed profile.`;

// Strict schema — all nested objects include additionalProperties: false + all properties in required
const PROFILE_TOOL = {
  name: "generate_subculture_profile",
  description:
    "Generate a complete, operationally accurate subculture intelligence profile for Speedbag",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "name",
      "slug",
      "description",
      "category",
      "keywords",
      "vernacular",
      "categorical_behaviors",
      "moments",
      "media_sources",
      "icons",
      "platforms",
      "psychographics",
      "adjacent_subcultures",
      "brand_fit_signals",
    ],
    properties: {
      name: {
        type: "string",
        description: "Display name, e.g. 'Sneakerheads'",
      },
      slug: {
        type: "string",
        description:
          "Lowercase URL-safe identifier with hyphens, e.g. 'sneakerheads'",
      },
      description: {
        type: "string",
        description:
          "2–3 sentence summary of this subculture, their identity, and what drives them",
      },
      category: {
        type: "string",
        description:
          "Primary category — e.g. Fashion, Gaming, Music, Sports, Food & Drink, Tech, Beauty & Wellness, Lifestyle, Entertainment, Outdoors, Finance, Automotive, Arts & Creativity",
      },
      keywords: {
        type: "array",
        items: { type: "string" },
        description:
          "20–30 search terms unique to this subculture — specific enough to build a Boolean query without pulling in unrelated audiences",
      },
      vernacular: {
        type: "array",
        items: { type: "string" },
        description:
          "15–25 slang terms, abbreviations, and in-group language members use — only terms strongly associated with this subculture, not general slang",
      },
      categorical_behaviors: {
        type: "array",
        items: { type: "string" },
        description:
          "15–25 specific nouns: objects, apps, brands, and activities this subculture buys, collects, trades, or interacts with (e.g. 'Jordan 1', 'StockX', 'grail', 'DS pair')",
      },
      moments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "timing", "description"],
          properties: {
            name: { type: "string" },
            timing: {
              type: "string",
              description:
                "e.g. 'Annual — typically April', 'Monthly — first Friday', 'Recurring — when new drops announced'",
            },
            description: {
              type: "string",
              description:
                "What happens and why it matters to this subculture",
            },
          },
        },
        description:
          "8–15 key recurring moments — calendar events, annual tentpoles, recurring rituals, and real-time trigger events that cause conversation spikes",
      },
      media_sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "type", "description"],
          properties: {
            name: { type: "string" },
            type: {
              type: "string",
              description:
                "e.g. YouTube Channel, Subreddit, Newsletter, Podcast, Instagram Account, TikTok Account, Twitter/X Account, Website/Blog, Discord Server, Forum",
            },
            description: {
              type: "string",
              description:
                "What this source covers and why it's trusted by the subculture",
            },
          },
        },
        description:
          "10–15 specific media sources, channels, accounts, and communities this subculture actually consumes",
      },
      icons: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "role", "sentiment"],
          properties: {
            name: { type: "string" },
            role: {
              type: "string",
              description: "What they're known for in this subculture",
            },
            sentiment: {
              type: "string",
              enum: ["revered", "respected", "controversial", "villainized"],
            },
          },
        },
        description:
          "10–20 people, brands, and entities (influencers, athletes, brands, characters) who are central to this subculture — both revered and villainized",
      },
      platforms: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["platform", "engagement_level", "content_formats"],
          properties: {
            platform: {
              type: "string",
              description:
                "e.g. Reddit, Twitter/X, TikTok, Instagram, YouTube, Discord, Twitch, Facebook, Pinterest, Substack, Forums",
            },
            engagement_level: {
              type: "string",
              enum: ["primary", "secondary", "minimal"],
            },
            content_formats: {
              type: "array",
              items: { type: "string" },
              description:
                "e.g. 'haul videos', 'cop or drop threads', 'grail reveals', 'fit checks'",
            },
          },
        },
        description:
          "Where this subculture primarily congregates and what they post there",
      },
      psychographics: {
        type: "object",
        additionalProperties: false,
        required: ["hero", "villain", "core_values", "motivations"],
        properties: {
          hero: {
            type: "string",
            description:
              "The archetype they aspire to / celebrate — describes an identity, not a person",
          },
          villain: {
            type: "string",
            description: "The archetype or behavior they reject and look down on",
          },
          core_values: {
            type: "array",
            items: { type: "string" },
            description: "5–8 core values that define the subculture's identity",
          },
          motivations: {
            type: "array",
            items: { type: "string" },
            description:
              "5–8 key motivations — what drives participation and engagement",
          },
        },
      },
      adjacent_subcultures: {
        type: "array",
        items: { type: "string" },
        description:
          "5–10 names of closely related subcultures with significant audience overlap — used to detect cross-community convergence",
      },
      brand_fit_signals: {
        type: "object",
        additionalProperties: false,
        required: ["fit_industries", "red_flags"],
        properties: {
          fit_industries: {
            type: "array",
            items: { type: "string" },
            description:
              "8–12 product/industry categories that resonate authentically with this subculture",
          },
          red_flags: {
            type: "array",
            items: { type: "string" },
            description:
              "5–8 types of brand behavior or category associations this subculture strongly rejects",
          },
        },
      },
    },
  },
} as unknown as Anthropic.Tool;

export async function generateSubcultureProfile(
  name: string,
  seed?: string
): Promise<SubcultureProfile> {
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    tools: [PROFILE_TOOL],
    messages: [
      {
        role: "user",
        content: `Generate a complete subculture profile for: ${name}${seed ? `\n\nAdditional context: ${seed}` : ""}`,
      },
    ],
  });

  const response = await stream.finalMessage();

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      "Claude did not call generate_subculture_profile — check model and tool definition"
    );
  }

  return toolUse.input as SubcultureProfile;
}
