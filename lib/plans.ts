/**
 * Plan definitions, feature flags, and limit enforcement for CulturePulse.
 *
 * Stripe price IDs live here — set them once your products are created in
 * the Stripe dashboard (or via `stripe products create`).
 */

export type PlanId = "free" | "starter" | "pro" | "agency";

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // USD / month
  stripePriceId: string | null; // null = not purchasable via Stripe
  limits: {
    monitors: number;        // -1 = unlimited
    briefs: number;          // -1 = unlimited; briefs per month
    customSubcultures: boolean;
    workspaces: number;      // 0 = not available
  };
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    stripePriceId: null,
    limits: {
      monitors: 1,
      briefs: 0,
      customSubcultures: false,
      workspaces: 0,
    },
    features: [
      "1 active monitor",
      "Pre-built subculture library",
      "Signal Board access",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 299,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    limits: {
      monitors: 3,
      briefs: 10, // 10 briefs/month
      customSubcultures: false,
      workspaces: 0,
    },
    features: [
      "3 active monitors",
      "10 content briefs / month",
      "Pre-built subculture library",
      "Signal Board + Acceleration scoring",
      "Weekly digest email",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 799,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    limits: {
      monitors: 15,
      briefs: -1,
      customSubcultures: true,
      workspaces: 0,
    },
    features: [
      "15 active monitors",
      "Unlimited content briefs",
      "Custom subculture creation",
      "Real-time breakout alerts",
      "Priority signal processing",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency",
    price: 2500,
    stripePriceId: process.env.STRIPE_PRICE_AGENCY ?? null,
    limits: {
      monitors: -1,
      briefs: -1,
      customSubcultures: true,
      workspaces: 5,
    },
    features: [
      "Unlimited monitors",
      "Unlimited content briefs",
      "Custom subculture creation",
      "Team workspaces (up to 5)",
      "White-label branding",
      "Custom domain support",
      "API access",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "agency"];

const ADMIN_EMAIL = "rileymdr@gmail.com";

/** Returns "agency" for the admin user so all plan checks pass at every layer. */
export function getEffectivePlan(email: string | null | undefined, dbPlan: string): PlanId {
  if (email === ADMIN_EMAIL) return "agency";
  return dbPlan as PlanId;
}

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.free;
}

/** Returns true if `userPlan` is at or above `requiredPlan` in the tier order. */
export function hasPlanAccess(userPlan: string, requiredPlan: PlanId): boolean {
  const userIdx = PLAN_ORDER.indexOf(userPlan as PlanId);
  const reqIdx  = PLAN_ORDER.indexOf(requiredPlan);
  return userIdx >= reqIdx;
}

export function canCreateMonitor(userPlan: string, currentMonitorCount: number): boolean {
  const plan = getPlan(userPlan);
  if (plan.limits.monitors === -1) return true;
  return currentMonitorCount < plan.limits.monitors;
}

export function canGenerateBrief(userPlan: string): boolean {
  const plan = getPlan(userPlan);
  return plan.limits.briefs !== 0; // 0 = no access, -1 = unlimited, N = monthly limit
}

export function canCreateCustomSubculture(userPlan: string): boolean {
  return getPlan(userPlan).limits.customSubcultures;
}

export function canCreateWorkspace(userPlan: string, currentWorkspaceCount: number): boolean {
  const plan = getPlan(userPlan);
  if (plan.limits.workspaces === 0) return false;
  if (plan.limits.workspaces === -1) return true;
  return currentWorkspaceCount < plan.limits.workspaces;
}
