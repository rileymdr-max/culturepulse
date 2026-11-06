import { NextRequest, NextResponse } from "next/server";
import { requireSession, serverError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  try {
    const subculture = await prisma.subculture.findUnique({
      where: { slug: params.slug },
    });

    if (!subculture) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ subculture });
  } catch (err) {
    console.error("[subcultures/[slug]]", err);
    return serverError();
  }
}
