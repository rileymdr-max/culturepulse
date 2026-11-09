/**
 * GET /api/status
 *
 * Returns which environment variables are present and which platforms are live.
 * Admin only. Never exposes any part of a value — only true/false per key.
 * Useful for diagnosing deployment issues.
 */

import { NextResponse } from "next/server";
import { isPlatformLive } from "@/lib/env";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const vars = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    APIFY_API_TOKEN: !!process.env.APIFY_API_TOKEN,
    REDDIT_CLIENT_ID: !!process.env.REDDIT_CLIENT_ID,
    REDDIT_CLIENT_SECRET: !!process.env.REDDIT_CLIENT_SECRET,
    TWITTER_BEARER_TOKEN: !!process.env.TWITTER_BEARER_TOKEN,
    TIKTOK_CLIENT_KEY: !!process.env.TIKTOK_CLIENT_KEY,
    INSTAGRAM_ACCESS_TOKEN: !!process.env.INSTAGRAM_ACCESS_TOKEN,
    FACEBOOK_ACCESS_TOKEN: !!process.env.FACEBOOK_ACCESS_TOKEN,
    FORCE_MOCK_DATA: process.env.FORCE_MOCK_DATA === "true",
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
  };

  const platforms = {
    reddit: isPlatformLive("reddit"),
    twitter: isPlatformLive("twitter"),
    tiktok: isPlatformLive("tiktok"),
    instagram: isPlatformLive("instagram"),
    facebook: isPlatformLive("facebook"),
    substack: isPlatformLive("substack"),
  };

  return NextResponse.json({ vars, platforms, timestamp: new Date().toISOString() });
}
