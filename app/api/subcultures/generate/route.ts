import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, serverError, paymentRequired } from "@/lib/api-helpers";
import { canCreateCustomSubculture } from "@/lib/plans";
import { getUserPlan } from "@/lib/plan-usage";
import { generateSubcultureProfile } from "@/lib/subculture-generator";
import { enrichSubcultureWithSignals } from "@/lib/subculture-enricher";
import { prisma, withDbRetry } from "@/lib/prisma";
import type { SubcultureProfile, SubcultureSignalData } from "@/lib/types/subculture";

// Scrape (60s) + Claude generation (60s) + DB write
export const maxDuration = 300;

const generateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  seed: z.string().max(2000).optional(),
  save: z.boolean().default(true),
  // Pass a pre-built profile + signal_data to skip generation and just save
  profile: z.unknown().optional(),
  signal_data: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request body.", parsed.error.flatten());
  }

  const { name, seed, save, profile: prebuiltProfile, signal_data: prebuiltSignals } = parsed.data;

  // ── Plan: previews (save: false) power Search on every plan; saving a new
  // subculture to the library is the Pro "custom subculture" feature.
  if (save) {
    const plan = await getUserPlan(session.user.id, session.user.email);
    if (!plan) return serverError("User not found.");
    if (!canCreateCustomSubculture(plan)) {
      return paymentRequired("Adding subcultures to your library is available on Pro and above.");
    }
  }

  try {
    let profile: SubcultureProfile;
    let signalData: SubcultureSignalData | undefined;

    if (prebuiltProfile && save) {
      // Skip generation — user is saving a profile they already previewed
      profile = prebuiltProfile as SubcultureProfile;
      signalData = prebuiltSignals as SubcultureSignalData | undefined;
    } else {
      // 1. Scrape real signals in parallel across Reddit, TikTok, Twitter
      signalData = await enrichSubcultureWithSignals(seed ?? name);

      // 2. Generate profile with real signals as Claude context
      profile = await generateSubcultureProfile(name, seed, signalData);
    }

    // Attach signal_data to the profile for the response
    profile.signal_data = signalData;

    if (!save) {
      return NextResponse.json({ profile, saved: false });
    }

    // Return existing profile if slug already exists (idempotent)
    const existing = await withDbRetry(() =>
      prisma.subculture.findUnique({ where: { slug: profile.slug } })
    );
    if (existing) {
      return NextResponse.json({ subculture: existing, saved: false, existing: true });
    }

    const subculture = await withDbRetry(() => prisma.subculture.create({
      data: {
        slug: profile.slug,
        name: profile.name,
        description: profile.description,
        category: profile.category,
        status: "draft",
        keywords: profile.keywords,
        vernacular: profile.vernacular,
        categoricalBehaviors: profile.categorical_behaviors,
        moments: profile.moments as object[],
        mediaSources: profile.media_sources as object[],
        icons: profile.icons as object[],
        platforms: profile.platforms as object[],
        psychographics: profile.psychographics as object,
        adjacentSubcultures: profile.adjacent_subcultures,
        brandFitSignals: profile.brand_fit_signals as object,
        signalData: signalData as object ?? null,
        generatedByAi: true,
        reviewedBy: null,
      },
    }));

    console.log(`[subcultures/generate] Created "${subculture.name}" (${subculture.id})`);

    return NextResponse.json({ subculture, saved: true }, { status: 201 });
  } catch (err) {
    console.error("[subcultures/generate]", err);
    return serverError();
  }
}
