/**
 * PATCH /api/admin/users/:id   { action: "approve" | "decline" }
 *  - approve: the user can sign in; they get a "You're in" email.
 *  - decline: the pending account is deleted (they can sign up again later).
 *  - remove:  deletes any non-admin account, approved or not, with all its data.
 * PATCH /api/admin/users/:id   { action: "setPlan", plan }
 *  - setPlan: puts an account on a plan by hand (Enterprise contracts, comps).
 *    Accounts paying through Stripe change plans in Stripe instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendAccountApproved } from "@/lib/email";
import { DEMO_EMAIL } from "@/lib/demo-policy";

const ADMIN_EMAIL = "rileymdr@gmail.com";

const bodySchema = z.union([
  z.object({ action: z.enum(["approve", "decline", "remove"]) }),
  z.object({ action: z.literal("setPlan"), plan: z.enum(["free", "starter", "pro", "agency", "enterprise"]) }),
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true, approvedAt: true, stripeSubscriptionId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (parsed.data.action === "setPlan") {
    if (user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "This account pays through Stripe. Change its plan in the Stripe dashboard." },
        { status: 400 }
      );
    }
    await prisma.user.update({ where: { id: user.id }, data: { plan: parsed.data.plan } });
    return NextResponse.json({ ok: true, plan: parsed.data.plan });
  }

  if (parsed.data.action === "remove") {
    if (user.email === ADMIN_EMAIL || user.email === DEMO_EMAIL) {
      return NextResponse.json({ error: "This account can't be removed." }, { status: 400 });
    }
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ ok: true, removed: true });
  }

  if (parsed.data.action === "decline") {
    if (user.approvedAt) {
      return NextResponse.json({ error: "Only pending sign-ups can be declined." }, { status: 400 });
    }
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ ok: true, declined: true });
  }

  if (user.approvedAt) return NextResponse.json({ ok: true, alreadyApproved: true });

  await prisma.user.update({ where: { id: user.id }, data: { approvedAt: new Date() } });

  let emailed = true;
  try {
    await sendAccountApproved({ toEmail: user.email, toName: user.name });
  } catch (err) {
    emailed = false;
    console.error("[admin/users] approval email failed", err);
  }

  return NextResponse.json({ ok: true, approved: true, emailed });
}
