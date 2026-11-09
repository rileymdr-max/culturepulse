import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma, withDbRetry } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const subcultures = await withDbRetry(() => prisma.subculture.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(status ? { status } : {}),
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
