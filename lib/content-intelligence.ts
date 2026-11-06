/**
 * Content Intelligence engine — Step 4 of the Speedbag architecture.
 *
 * Takes a subculture profile + optional live signal context and uses
 * claude-opus-5-5 with adaptive thinking to generate a structured
 * creative strategy brief.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Subculture } from "@prisma/client";
import type { AccelerationSignal } from "./acceleration";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContentAngle {
  headline: string;
  description: string;
  example: string;
  platform: string;
}

export interface PlatformStrategyItem {
  platform: string;
  approach: string;
  formats: string[];
  tone: string;
}

export interface BriefBrandFit {
  ideal_brands: string[];
  warning_signals: string[];
  engagement_window: string;
}

export interface GeneratedBrief {
  headline: string;
  urgency: "act-now" | "this-week" | "monitor";
  moment_summary: string;
  acceleration_context: string;
  content_angles: ContentAngle[];
  platform_strategy: PlatformStrategyItem[];
  brand_fit: BriefBrandFit;
}

export interface BriefTopPost {
  title: string;
  url: string;
  score: number;
  platform: string;
}

export interface BriefSignalContext {
  signal: AccelerationSignal;
  topPosts: BriefTopPost[];
}

// ─── Claude tool schema ───────────────────────────────────────────────────────

const BRIEF_TOOL = {
  name: "generate_content_brief",
  description: "Generate a structured cultural strategy brief for a brand creative team.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "headline",
      "urgency",
      "moment_summary",
      "acceleration_context",
      "content_angles",
      "platform_strategy",
      "brand_fit",
    ],
    properties: {
      headline: { type: "string", description: "Short punchy brief title (≤12 words)" },
      urgency: {
        type: "string",
        enum: ["act-now", "this-week", "monitor"],
        description: "Urgency tier based on signal strength",
      },
      moment_summary: {
        type: "string",
        description: "2-3 sentences: what is specifically happening in this subculture right now",
      },
      acceleration_context: {
        type: "string",
        description: "2-3 sentences: why this moment is significant and time-sensitive for brands",
      },
      content_angles: {
        type: "array",
        description: "3-5 specific, non-generic content angles",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["headline", "description", "example", "platform"],
          properties: {
            headline: { type: "string", description: "Name of the angle (≤8 words)" },
            description: { type: "string", description: "What this angle is and why it works (2-3 sentences)" },
            example: { type: "string", description: "Concrete execution example specific enough to brief a creative team" },
            platform: { type: "string", description: "Primary platform for this angle" },
          },
        },
      },
      platform_strategy: {
        type: "array",
        description: "How to show up on each relevant platform",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["platform", "approach", "formats", "tone"],
          properties: {
            platform: { type: "string" },
            approach: { type: "string", description: "How to engage on this platform (1-2 sentences)" },
            formats: {
              type: "array",
              items: { type: "string" },
              description: "Specific content formats that work here",
            },
            tone: { type: "string", description: "Tone of voice for this platform (1 sentence)" },
          },
        },
      },
      brand_fit: {
        type: "object",
        additionalProperties: false,
        required: ["ideal_brands", "warning_signals", "engagement_window"],
        properties: {
          ideal_brands: {
            type: "array",
            items: { type: "string" },
            description: "Types of brands or industries that have natural credibility here",
          },
          warning_signals: {
            type: "array",
            items: { type: "string" },
            description: "Specific behaviors or approaches that would look inauthentic or desperate",
          },
          engagement_window: {
            type: "string",
            description: "Specific timing guidance: when to act and when the window closes",
          },
        },
      },
    },
  },
} as unknown as Anthropic.Tool;

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSubcultureContext(s: Subculture): string {
  const moments = (s.moments as Array<{ name: string; timing: string; description: string }>)
    .map((m) => `  - ${m.name} (${m.timing}): ${m.description}`)
    .join("\n");

  const icons = (s.icons as Array<{ name: string; role: string; sentiment: string }>)
    .map((i) => `  - ${i.name} [${i.sentiment}]: ${i.role}`)
    .join("\n");

  const psych = s.psychographics as {
    hero: string;
    villain: string;
    core_values: string[];
    motivations: string[];
  };

  const brandFit = s.brandFitSignals as {
    fit_industries: string[];
    red_flags: string[];
  };

  return `SUBCULTURE: ${s.name}
CATEGORY: ${s.category}
DESCRIPTION: ${s.description}

KEYWORDS (search terms): ${s.keywords.join(", ")}
VERNACULAR (actual language used): ${s.vernacular.join(", ")}
BEHAVIORS (what they buy/do/collect): ${s.categoricalBehaviors.join(", ")}
ADJACENT SUBCULTURES: ${s.adjacentSubcultures.join(", ")}

MOMENTS & TRIGGERS:
${moments}

ICONS & ENTITIES:
${icons}

PSYCHOGRAPHICS:
  Hero archetype: ${psych.hero}
  Villain archetype: ${psych.villain}
  Core values: ${psych.core_values.join(", ")}
  Motivations: ${psych.motivations.join(", ")}

BRAND FIT SIGNALS:
  Fits with: ${brandFit.fit_industries.join(", ")}
  Red flags: ${brandFit.red_flags.join(", ")}`;
}

function buildSignalContext(ctx: BriefSignalContext): string {
  const { signal, topPosts } = ctx;
  const velStr = signal.velocity > 0 ? `+${signal.velocity}%` : `${signal.velocity}%`;
  const redditVel = signal.platform.reddit.velocity;
  const twitterVel = signal.platform.twitter.velocity;

  const postsText = topPosts
    .slice(0, 6)
    .map((p, i) => `  ${i + 1}. [${p.platform}] "${p.title}" — ${p.score.toLocaleString()} pts`)
    .join("\n");

  return `
LIVE SIGNAL (as of now):
  Velocity: ${velStr} above 7-run baseline
  Momentum: ${signal.momentum} (velocity itself is ${signal.momentum})
  Cross-platform strength: ${signal.crossPlatformStrength}/100
  Breakout score: ${signal.breakoutScore}/100
  Reddit velocity: ${redditVel !== null ? `${redditVel > 0 ? "+" : ""}${redditVel}%` : "no data"}
  Twitter velocity: ${twitterVel !== null ? `${twitterVel > 0 ? "+" : ""}${twitterVel}%` : "no data"}

TRENDING POSTS (last monitor run):
${postsText || "  (no posts captured yet)"}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateContentBrief(
  subculture: Subculture,
  signalContext?: BriefSignalContext
): Promise<GeneratedBrief> {
  const client = new Anthropic();

  const hasSignal = !!signalContext;
  const systemPrompt = `You are a senior cultural strategist at a top creative agency specializing in subcultural intelligence.

Your briefs transform real-time social data into immediate creative action. You are known for being SPECIFIC, non-generic, and culturally fluent. You never use clichés like "authentic storytelling," "meet them where they are," or "leverage the conversation."

You understand that subcultural moments are brief windows (24–72 hours) before mainstream adoption. Your job: identify what's actually happening, what it means for brands, and what to DO right now.

RULES:
- Reference the actual vernacular. Use the words they use.
- Content angles must be specific enough that a creative director can brief a team TODAY.
- The example in each angle must name a concrete execution — not "partner with influencers" but the exact post, format, and platform.
- Name which brands would look authentic vs. desperate. Be specific about brand types.
- If two platforms are confirming the same signal, that's a stronger call to action.

URGENCY CALIBRATION:
- "act-now": Velocity ≥+30% AND momentum is rising — 24-72hr window
- "this-week": Velocity +10% to +29% OR stable positive momentum — 7-day window
- "monitor": Velocity < +10% or no live signal — building signal, not yet actionable${
  !hasSignal ? "\n- No live signal is available for this brief. Generate a strategic baseline brief; default urgency to \"monitor\" unless the subculture profile alone suggests an imminent moment." : ""
}

Always call generate_content_brief.`;

  const userContent = hasSignal
    ? `${buildSubcultureContext(subculture)}\n${buildSignalContext(signalContext!)}\n\nGenerate a complete content intelligence brief. The signal is live and time-sensitive — be specific about what's happening RIGHT NOW based on the trending posts.`
    : `${buildSubcultureContext(subculture)}\n\nGenerate a strategic baseline brief for this subculture. No live signal data is available — focus on the structural moments, tensions, and content angles that would work for this community.`;

  const stream = client.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 6000,
    thinking: { type: "adaptive" },
    system: systemPrompt,
    tools: [BRIEF_TOOL],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userContent }],
  });

  const response = await stream.finalMessage();
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not call generate_content_brief");
  }

  return toolUse.input as GeneratedBrief;
}
