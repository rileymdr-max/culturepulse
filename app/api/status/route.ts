/**
 * GET /api/status
 *
 * Returns which environment variables are present and which platforms are live.
 * Never exposes the actual values — only true/false per key.
 * Useful for diagnosing deployment issues.
 */

import { NextResponse } from "next/server";
import { isPlatformLive } from "@/lib/env";

export async function GET() {
  const vars = {
    APIFY_API_TOKEN: !!process.env.APIFY_API_TOKEN,
    REDDIT_CLIENT_ID: !!process.env.REDDIT_CLIENT_ID,
    REDDIT_CLIENT_SECRET: !!process.env.REDDIT_CLIENT_SECRET,
    TWITTER_BEARER_TOKEN: !!process.env.TWITTER_BEARER_TOKEN,
    TIKTOK_CLIENT_KEY: !!process.env.TIKTOK_CLIENT_KEY,
    INSTAGRAM_ACCESS_TOKEN: !!process.env.INSTAGRAM_ACCESS_TOKEN,
    FACEBOOK_ACCESS_TOKEN: !!process.env.FACEBOOK_ACCESS_TOKEN,
    FORCE_MOCK_DATA: !!process.env.FORCE_MOCK_DATA,
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
