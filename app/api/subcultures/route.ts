import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma, withDbRetry } from "@/lib/prisma";
import { isDemoEmail } from "@/lib/demo";

export async function GET(req: NextRequest) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const isDemo = isDemoEmail(session.user.email);

  try {
    const subcultures = await withDbRetry(() => prisma.subculture.findMany({
      where: {
        ...(category ? { category } : {}),
        // Demo users only see approved, demo-visible entries; others see all
        ...(isDemo ? { status: "approved", demoVisible: true } : status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        status: true,
        generatedByAi: true,
        enrichedByApify: true,
        createdAt: true,
        updatedAt: true,
      },
    }));

    return NextResponse.json({ subcultures, total: subcultures.length });
  } catch (err) {
    console.error("[subcultures]", err);
    return serverError();
  }
}
