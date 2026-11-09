/**
 * Environment variable validation using Zod.
 * This runs at startup and throws clear errors for missing required variables.
 */

import { z } from "zod";

// Converts empty strings to undefined so optional fields don't fail URL/min
// validation when the .env.local template has empty values like SOME_KEY=""
const emptyStringToUndefined = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().optional()
);

const emptyUrl = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().url().optional()
);

const envSchema = z.object({
  // Core
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),
  NEXTAUTH_SECRET: z
    .string()
    .min(1, "NEXTAUTH_SECRET is required"),
  // Optional on Vercel: NextAuth derives each deployment's own URL there, so
  // every preview branch works without a per-branch setting. Required elsewhere.
  NEXTAUTH_URL: emptyUrl,

  // Optional platform API keys — missing/empty values fall back to mock data
  REDDIT_CLIENT_ID: emptyStringToUndefined,
  REDDIT_CLIENT_SECRET: emptyStringToUndefined,
  REDDIT_USER_AGENT: emptyStringToUndefined,

  TWITTER_BEARER_TOKEN: emptyStringToUndefined,
  TWITTER_API_KEY: emptyStringToUndefined,
  TWITTER_API_SECRET: emptyStringToUndefined,

  TIKTOK_CLIENT_KEY: emptyStringToUndefined,
  TIKTOK_CLIENT_SECRET: emptyStringToUndefined,

  INSTAGRAM_ACCESS_TOKEN: emptyStringToUndefined,
  INSTAGRAM_BUSINESS_ACCOUNT_ID: emptyStringToUndefined,

  FACEBOOK_ACCESS_TOKEN: emptyStringToUndefined,
  FACEBOOK_APP_ID: emptyStringToUndefined,
  FACEBOOK_APP_SECRET: emptyStringToUndefined,

  // Anthropic — required for AI subculture generation
  ANTHROPIC_API_KEY: emptyStringToUndefined,

  // Apify — optional, enables TikTok + Audience Intelligence live data
  APIFY_API_TOKEN: emptyStringToUndefined,

  // Cron secret — secures the /api/monitors/run endpoint on Vercel
  CRON_SECRET: emptyStringToUndefined,

  // Resend — optional, email alerts/digests unavailable when absent
  RESEND_API_KEY: emptyStringToUndefined,
  RESEND_FROM: emptyStringToUndefined,

  // Rate limiting (Upstash) — optional, in-memory fallback used when absent
  UPSTASH_REDIS_REST_URL: emptyUrl,
  UPSTASH_REDIS_REST_TOKEN: emptyStringToUndefined,

  // Stripe — optional, billing features unavailable when absent
  STRIPE_SECRET_KEY:      emptyStringToUndefined,
  STRIPE_WEBHOOK_SECRET:  emptyStringToUndefined,
  STRIPE_PRICE_STARTER:   emptyStringToUndefined,
  STRIPE_PRICE_PRO:       emptyStringToUndefined,
  STRIPE_PRICE_AGENCY:    emptyStringToUndefined,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: emptyStringToUndefined,

  // Force mock data regardless of API key presence
  FORCE_MOCK_DATA: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
}).superRefine((e, ctx) => {
  if (!e.NEXTAUTH_URL && !process.env.VERCEL) {
    ctx.addIssue({ code: "custom", path: ["NEXTAUTH_URL"], message: "NEXTAUTH_URL is required outside Vercel" });
  }
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates process.env against the schema.
 * Throws a descriptive error listing all missing/invalid fields.
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n\n❌ Invalid environment variables:\n${issues}\n\n` +
        `Check your .env.local file against .env.example.\n`
    );
  }
  return result.data;
}

export const env = validateEnv();

/**
 * Returns true when a given platform has its required API keys configured
 * and FORCE_MOCK_DATA is not set.
 */
export function isPlatformLive(
  platform: "reddit" | "twitter" | "tiktok" | "instagram" | "facebook" | "substack"
): boolean {
  if (env.FORCE_MOCK_DATA) return false;

  switch (platform) {
    case "reddit":
      // Live via official OAuth keys OR via Apify scraper (no keys needed)
      return !!(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET) || !!env.APIFY_API_TOKEN;
    case "twitter":
      return !!env.TWITTER_BEARER_TOKEN || !!env.APIFY_API_TOKEN;
    case "tiktok":
      // Live via Apify scraper (no TikTok API key needed) or official Research API
      return !!(env.APIFY_API_TOKEN || (env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET));
    case "instagram":
      // Live via official Graph API OR via Apify scraper (no Meta approval needed)
      return !!(env.INSTAGRAM_ACCESS_TOKEN && env.INSTAGRAM_BUSINESS_ACCOUNT_ID) || !!env.APIFY_API_TOKEN;
    case "facebook":
      return !!(env.FACEBOOK_ACCESS_TOKEN && env.FACEBOOK_APP_ID);
    case "substack":
      // Substack uses RSS — no API key required
      return true;
    default:
      return false;
  }
}
