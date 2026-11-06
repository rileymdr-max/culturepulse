import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, badRequest, serverError } from "@/lib/api-helpers";
import { generateSubcultureProfile } from "@/lib/subculture-generator";
import { prisma } from "@/lib/prisma";

// Claude generation + DB write can take up to 90 seconds
export const maxDuration = 120;

const generateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  seed: z.string().max(500).optional(),
  save: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const { error: authError } = await requireSession();
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

  const { name, seed, save } = parsed.data;

  try {
    const profile = await generateSubcultureProfile(name, seed);

    if (!save) {
      return NextResponse.json({ profile, saved: false });
    }

    // Return existing profile if slug already exists (idempotent)
    const existing = await prisma.subculture.findUnique({
      where: { slug: profile.slug },
    });
    if (existing) {
      return NextResponse.json({ subculture: existing, saved: false, existing: true });
    }

    const subculture = await prisma.subculture.create({
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
        generatedByAi: true,
        reviewedBy: null,
      },
    });

    console.log(`[subcultures/generate] Created "${subculture.name}" (${subculture.id})`);

    return NextResponse.json({ subculture, saved: true }, { status: 201 });
  } catch (err) {
    console.error("[subcultures/generate]", err);
    return serverError();
  }
}
