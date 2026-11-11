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
    briefs: number;          // briefs per calendar month (UTC); 0 = none, -1 = unlimited
    brandAudits: number;     // Brand Audits; 0 = none, -1 = unlimited
    brandAuditPeriod: "month" | "lifetime"; // "lifetime" = a one-time trial allowance
    customSubcultures: boolean;
    analysisTools: boolean;  // Compare
    accelerationScores: boolean; // Velocity / momentum / cross-platform breakdown
    weeklyDigest: boolean;
    breakoutAlerts: boolean; // real-time breakout emails
    workspaces: number;      // 0 = not available
  };
  features: string[];
  /** Advertised but not built yet — shown as "coming soon". */
  comingSoon?: string[];
}

/**
 * Plan IDs are stored in the database and in Stripe env vars, so they never
 * change. Only `name` is customer-facing: the "agency" plan is sold as Studio.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    stripePriceId: null,
    limits: {
      monitors: 1,
      briefs: 0,
      brandAudits: 1,
      brandAuditPeriod: "lifetime",
      customSubcultures: false,
      analysisTools: false,
      accelerationScores: false,
      weeklyDigest: false,
      breakoutAlerts: false,
      workspaces: 0,
    },
    features: [
      "1 active monitor",
      "Browse the subculture library",
      "Breakout Score on your monitor",
      "1 trial Brand Audit",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 299,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    limits: {
      monitors: 3,
      briefs: 5,
      brandAudits: 1,
      brandAuditPeriod: "lifetime",
      customSubcultures: false,
      analysisTools: false,
      accelerationScores: true,
      weeklyDigest: true,
      breakoutAlerts: false,
      workspaces: 0,
    },
    features: [
      "3 active monitors",
      "5 content briefs / month",
      "Full Acceleration scoring",
      "Weekly digest email",
      "1 trial Brand Audit",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 799,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    limits: {
      monitors: 10,
      briefs: 30,
      brandAudits: 5,
      brandAuditPeriod: "month",
      customSubcultures: true,
      analysisTools: true,
      accelerationScores: true,
      weeklyDigest: true,
      breakoutAlerts: true,
      workspaces: 0,
    },
    features: [
      "10 active monitors",
      "30 content briefs / month",
      "5 Brand Audits / month",
      "Side-by-side community Compare",
      "Custom subculture creation",
      "Real-time breakout alerts",
    ],
  },
  agency: {
    id: "agency",
    name: "Studio",
    price: 2500,
    stripePriceId: process.env.STRIPE_PRICE_AGENCY ?? null,
    limits: {
      monitors: 50,
      briefs: -1,
      brandAudits: -1,
      brandAuditPeriod: "month",
      customSubcultures: true,
      analysisTools: true,
      accelerationScores: true,
      weeklyDigest: true,
      breakoutAlerts: true,
      workspaces: 5,
    },
    features: [
      "50 active monitors",
      "Unlimited content briefs",
      "Unlimited Brand Audits",
      "Everything in Pro",
      "Team workspaces (up to 5)",
      "White-label branding",
    ],
    comingSoon: ["API access", "Custom domain"],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "agency"];

const ADMIN_EMAIL = "rileymdr@gmail.com";

/** Returns "agency" (Studio) for the admin user so all plan checks pass at every layer. */
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

/** `used` = briefs generated this calendar month. */
export function canGenerateBrief(userPlan: string, usedThisMonth: number): boolean {
  return withinLimit(getPlan(userPlan).limits.briefs, usedThisMonth);
}

/** `used` = audits in the plan's period (this month, or ever for trial plans). */
export function canRunBrandAudit(userPlan: string, used: number): boolean {
  return withinLimit(getPlan(userPlan).limits.brandAudits, used);
}

export function hasAnalysisTools(userPlan: string): boolean {
  return getPlan(userPlan).limits.analysisTools;
}

/** 0 = none, -1 = unlimited, N = cap. */
function withinLimit(limit: number, used: number): boolean {
  if (limit === -1) return true;
  return used < limit;
}

/** Start of the current billing-usage month (calendar month, UTC). */
export function startOfUsageMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
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
