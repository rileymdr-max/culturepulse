/**
 * Plan definitions, feature flags, and limit enforcement for CulturePulse.
 *
 * Plans scale on what a customer manages: brands (brand slots), library
 * access, seats and monthly usage. There is no free plan — a signed-in user
 * without a subscription ("free" in the database) can only browse library
 * teasers until they buy a plan or the one-time Brand Culture Snapshot.
 *
 * Stripe price IDs come from env vars — create the products in Stripe first.
 */

export type PlanId = "free" | "starter" | "pro" | "agency" | "enterprise";

/** -1 = unlimited. */
type Limit = number;

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** USD per month on monthly billing. For Enterprise, the "from" price. */
  price: number;
  stripePriceId: string | null;       // monthly price; null = not self-serve
  stripePriceIdAnnual: string | null; // annual price (2 months free)
  /** Sold through a sales call, not checkout. */
  salesLed?: boolean;
  limits: {
    brandSlots: Limit;         // brands with a saved audit at once
    brandAudits: Limit;        // audit runs per month
    libraryPicks: Limit;       // full library profiles; -1 = whole library
    customSubcultures: Limit;  // new subcultures saved to the library per month
    monitors: Limit;
    briefs: Limit;             // per month
    seats: Limit;              // people, including the owner
    workspaces: Limit;         // 0 = not available
    discovery: boolean;        // live Search / Discover previews
    analysisTools: boolean;    // Compare
    accelerationScores: boolean;
    weeklyDigest: boolean;
    breakoutAlerts: boolean;
    whiteLabel: boolean;
  };
  features: string[];
  /** Advertised but not built yet — shown as "coming soon". */
  comingSoon?: string[];
}

const NONE = {
  brandSlots: 0,
  brandAudits: 0,
  libraryPicks: 0,
  customSubcultures: 0,
  monitors: 0,
  briefs: 0,
  seats: 1,
  workspaces: 0,
  discovery: false,
  analysisTools: false,
  accelerationScores: false,
  weeklyDigest: false,
  breakoutAlerts: false,
  whiteLabel: false,
};

/**
 * Plan IDs are stored in the database and in Stripe env vars, so they never
 * change. Only `name` is customer-facing: the "agency" plan is sold as Studio.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "No plan",
    tagline: "Browse the library",
    price: 0,
    stripePriceId: null,
    stripePriceIdAnnual: null,
    limits: NONE,
    features: ["Subculture library previews"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "For a single brand or freelancer",
    price: 299,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? null,
    limits: {
      ...NONE,
      brandSlots: 1,
      brandAudits: 1,
      libraryPicks: 10,
      monitors: 3,
      briefs: 5,
      discovery: true,
      accelerationScores: true,
      weeklyDigest: true,
    },
    features: [
      "1 brand, re-audit it daily",
      "10 library profiles you pick",
      "3 active monitors",
      "5 content briefs / month",
      "Live Discover search",
      "Weekly digest email",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For growing brands and boutique agencies",
    price: 899,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? null,
    limits: {
      ...NONE,
      brandSlots: 3,
      brandAudits: 5,
      libraryPicks: -1,
      customSubcultures: 3,
      monitors: 10,
      briefs: 30,
      seats: 3,
      workspaces: 1,
      discovery: true,
      analysisTools: true,
      accelerationScores: true,
      weeklyDigest: true,
      breakoutAlerts: true,
    },
    features: [
      "3 brands at a time, 5 audited / month",
      "Full subculture library",
      "3 custom subcultures / month",
      "10 active monitors",
      "30 content briefs / month",
      "3 seats",
      "Breakout alerts + Compare",
    ],
  },
  agency: {
    id: "agency",
    name: "Studio",
    tagline: "For agencies running many clients",
    price: 2500,
    stripePriceId: process.env.STRIPE_PRICE_AGENCY ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_AGENCY_ANNUAL ?? null,
    limits: {
      ...NONE,
      brandSlots: 10,
      brandAudits: 25,
      libraryPicks: -1,
      customSubcultures: 15,
      monitors: 50,
      briefs: -1,
      seats: 10,
      workspaces: 10,
      discovery: true,
      analysisTools: true,
      accelerationScores: true,
      weeklyDigest: true,
      breakoutAlerts: true,
      whiteLabel: true,
    },
    features: [
      "10 brands at a time, 25 audited / month",
      "Full library + new profiles first",
      "15 custom subcultures / month",
      "50 active monitors",
      "Unlimited content briefs",
      "10 seats + client workspaces",
      "White-label branding",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large agencies and holding companies",
    price: 6000,
    stripePriceId: null,
    stripePriceIdAnnual: null,
    salesLed: true,
    limits: {
      brandSlots: -1,
      brandAudits: -1,
      libraryPicks: -1,
      customSubcultures: -1,
      monitors: -1,
      briefs: -1,
      seats: -1,
      workspaces: -1,
      discovery: true,
      analysisTools: true,
      accelerationScores: true,
      weeklyDigest: true,
      breakoutAlerts: true,
      whiteLabel: true,
    },
    features: [
      "Unlimited brands and audits",
      "Custom subculture research",
      "Unlimited seats and workspaces",
      "Dedicated strategist",
      "Quarterly culture report",
      "Annual contract",
    ],
    comingSoon: ["API access", "SSO"],
  },
};

/** Tier order, lowest first. */
export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "agency", "enterprise"];

/** Plans shown on pricing pages. */
export const DISPLAY_PLANS: PlanId[] = ["starter", "pro", "agency", "enterprise"];

/** Annual billing: pay for 10 months, get 12. */
export const ANNUAL_MONTHS_CHARGED = 10;
export function annualMonthlyPrice(plan: Plan): number {
  return Math.round((plan.price * ANNUAL_MONTHS_CHARGED) / 12);
}

/** One-time Brand Culture Snapshot: the paid way in. */
export const SNAPSHOT = {
  name: "Brand Culture Snapshot",
  price: 499,
  stripePriceId: process.env.STRIPE_PRICE_SNAPSHOT ?? null,
  /** Full library profiles unlocked per purchase. */
  libraryPicks: 3,
  /** The price is credited to a subscription started within this window. */
  creditWindowDays: 30,
  /** Stripe coupon (amount off, once) applied as that credit. */
  creditCouponId: process.env.STRIPE_COUPON_SNAPSHOT_CREDIT ?? null,
  features: [
    "A full Brand Audit of one brand",
    "Downloadable PDF report",
    "3 full library profiles",
    "$499 credited toward your first month",
  ],
};

/** Where "Talk to us" sends Enterprise prospects. */
export const SALES_URL = "https://calendly.com/rileymdr/30min";

const ADMIN_EMAIL = "rileymdr@gmail.com";

/** Returns the top plan for the admin user so all plan checks pass at every layer. */
export function getEffectivePlan(email: string | null | undefined, dbPlan: string): PlanId {
  if (email === ADMIN_EMAIL) return "enterprise";
  return (PLANS[dbPlan as PlanId] ? dbPlan : "free") as PlanId;
}

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.free;
}

/** True if `userPlan` is at or above `requiredPlan` in the tier order. */
export function hasPlanAccess(userPlan: string, requiredPlan: PlanId): boolean {
  return PLAN_ORDER.indexOf(userPlan as PlanId) >= PLAN_ORDER.indexOf(requiredPlan);
}

/** The lowest plan that includes a feature, for upgrade prompts. */
export function lowestPlanWith(test: (p: Plan) => boolean): Plan {
  return PLANS[PLAN_ORDER.find((id) => test(PLANS[id])) ?? "enterprise"];
}

/** 0 = none, -1 = unlimited, N = cap. */
export function withinLimit(limit: Limit, used: number): boolean {
  return limit === -1 || used < limit;
}

export function formatLimit(limit: Limit): string {
  return limit === -1 ? "Unlimited" : String(limit);
}

/** Start of the current usage month (calendar month, UTC). */
export function startOfUsageMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function canCreateMonitor(userPlan: string, currentMonitorCount: number): boolean {
  return withinLimit(getPlan(userPlan).limits.monitors, currentMonitorCount);
}

/** `used` = briefs generated this calendar month. */
export function canGenerateBrief(userPlan: string, usedThisMonth: number): boolean {
  return withinLimit(getPlan(userPlan).limits.briefs, usedThisMonth);
}

export function hasAnalysisTools(userPlan: string): boolean {
  return getPlan(userPlan).limits.analysisTools;
}

export function hasFullLibrary(userPlan: string): boolean {
  return getPlan(userPlan).limits.libraryPicks === -1;
}

export function canCreateWorkspace(userPlan: string, currentWorkspaceCount: number): boolean {
  return withinLimit(getPlan(userPlan).limits.workspaces, currentWorkspaceCount);
}
