/**
 * POST /api/auth/register
 * Creates a new user account with a bcrypt-hashed password.
 *
 * New accounts start unapproved: they can't sign in until the admin approves
 * them (Admin → Sign-ups), and the admin gets an email. People with a pending
 * workspace invite are approved automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendSignupRequest } from "@/lib/email";

const ADMIN_EMAIL = "rileymdr@gmail.com";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const invited = await prisma.workspaceInvite.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    const approved = !!invited || email === ADMIN_EMAIL;

    const user = await prisma.user.create({
      data: { name, email, hashedPassword, approvedAt: approved ? new Date() : null },
      select: { id: true, email: true, name: true },
    });

    if (!approved) {
      try {
        await sendSignupRequest({ toEmail: ADMIN_EMAIL, name, email });
      } catch (err) {
        // The sign-up still shows in Admin → Sign-ups; email is a convenience.
        console.error("[register] admin notification failed", err);
      }
    }

    return NextResponse.json({ user, pending: !approved }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
