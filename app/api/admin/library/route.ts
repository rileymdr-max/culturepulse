import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const subcultures = await prisma.subculture.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      status: true,
      demoVisible: true,
      generatedByAi: true,
      enrichedByApify: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { monitors: true, briefs: true } },
    },
  });

  return NextResponse.json({ subcultures, total: subcultures.length });
}

const patchSchema = z.union([
  z.object({ status: z.enum(["draft", "approved", "archived"]) }),
  z.object({ demoVisible: z.boolean() }),
]);

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data = "demoVisible" in body.data
    ? { demoVisible: body.data.demoVisible }
    : { status: (body.data as { status: string }).status };

  const updated = await prisma.subculture.update({
    where: { id },
    data,
    select: { id: true, slug: true, name: true, status: true, demoVisible: true },
  });

  return NextResponse.json(updated);
}
