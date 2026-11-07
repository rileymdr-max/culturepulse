import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { PlanId } from "@/lib/plans";

const ADMIN_EMAIL = "rileymdr@gmail.com";

export async function requireAdmin(): Promise<
  | { session: Awaited<ReturnType<typeof getServerSession>>; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.email !== ADMIN_EMAIL) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}

export function isAdmin(email?: string | null): boolean {
  return email === ADMIN_EMAIL;
}

/** Returns "agency" for the admin user so all plan checks pass. */
export function getEffectivePlan(email: string | null | undefined, dbPlan: string): PlanId {
  if (isAdmin(email)) return "agency";
  return dbPlan as PlanId;
}
