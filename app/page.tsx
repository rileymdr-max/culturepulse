import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Search,
  Radio,
  FileText,
  Layers,
  Mail,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { Logo } from "@/components/logo";
import { PendingLink } from "@/components/pending-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIGNUP_HREF = "/register";
const PLATFORMS = "Reddit, TikTok, Instagram, X, Facebook and Substack";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardedAt: true },
    });
    redirect(user?.onboardedAt ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Spot the subcultures breaking out this week, before your competitors do.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              CulturePulse scores momentum inside micro-communities across {PLATFORMS}, then turns
              the strongest signals into briefs your creative team can act on.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <PendingLink href={SIGNUP_HREF} arrow className={cn(buttonVariants({ size: "xl" }), "group")}>
                Start free
              </PendingLink>
              <p className="text-sm text-muted-foreground">Free plan · No credit card required</p>
            </div>
          </div>

          <SignalBoardPreview />
        </section>

        {/* ── How it works ── */}
        <section id="how" className="scroll-mt-20 border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              From a cultural hunch to a creative brief in three steps
            </h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
              <Step
                icon={Search}
                title="Search a subculture"
                body="Type any niche — “gorpcore”, “BookTok”, “quiet luxury” — and get velocity, top voices, platform split and the vocabulary the community actually uses."
              />
              <Step
                icon={Radio}
                title="Monitor for breakouts"
                body="Pin communities to your Signal Board. Each one gets a Breakout Score from velocity, momentum and cross-platform strength, and you’re emailed when it spikes."
              />
              <Step
                icon={FileText}
                title="Generate a brief"
                body="One click turns a signal into a strategy brief: platform-specific angles, creative hooks, brand-fit notes and an urgency score."
              />
            </div>
          </div>
        </section>

        {/* ── Main feature: Brand Audit ── */}
        <section id="features" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Enter a brand’s handle. See which subcultures already love it.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Audience Audit maps a brand’s social following to the subcultures inside it, scores
                the fit of each one, and surfaces adjacent communities you aren’t reaching yet.
              </p>
              <ul className="mt-8 space-y-3 text-[15px]">
                {[
                  "Subculture DNA for any public brand handle",
                  "A fit score for every community in the brand’s audience",
                  "Adjacent communities the brand isn’t reaching yet",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <BrandAuditPreview />
          </div>

          {/* Supporting features */}
          <div className="mt-24 grid gap-10 sm:grid-cols-3 sm:gap-8">
            <Step
              icon={Layers}
              title="Subculture Library"
              body="Profiles covering vernacular, cultural icons, behaviors, psychographics and brand-fit signals, built from real community data."
            />
            <Step
              icon={FileText}
              title="Content Briefs"
              body="Briefs built from live signal context, with platform angles, timing hooks and urgency scoring, in under two minutes."
            />
            <Step
              icon={Mail}
              title="Alerts and weekly digest"
              body="Breakout alerts the moment a monitored community spikes, plus a Monday digest of what moved across your board."
            />
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="scroll-mt-20 border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Plans from $0. Upgrade when you need more monitors.
            </h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PLAN_ORDER.map((id) => {
                const plan = PLANS[id];
                const featured = id === "pro";
                return (
                  <div
                    key={id}
                    className={cn(
                      "flex flex-col rounded-xl border bg-background p-6",
                      featured ? "border-primary ring-1 ring-primary" : "border-border"
                    )}
                  >
                    <h3 className="text-base font-semibold">{plan.name}</h3>
                    <p className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-semibold tracking-tight tabular-nums">
                        ${plan.price.toLocaleString("en-US")}
                      </span>
                      {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                    </p>
                    <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <PendingLink
                      href={SIGNUP_HREF}
                      className={cn(
                        buttonVariants({ variant: featured ? "default" : "outline", size: "lg" }),
                        "mt-8 w-full"
                      )}
                    >
                      {id === "free" ? "Start free" : `Choose ${plan.name}`}
                    </PendingLink>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="bg-foreground text-background">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Find your first breakout signal today.
              </h2>
              <p className="mt-3 text-lg text-background/75">
                Start on the free plan with one monitor. No credit card required.
              </p>
            </div>
            <PendingLink
              href={SIGNUP_HREF}
              arrow
              className={cn(
                buttonVariants({ size: "xl" }),
                "group bg-background text-foreground hover:bg-background/90"
              )}
            >
              Start free
            </PendingLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <Logo />
          <nav className="flex gap-6">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
          </nav>
          <p>© {new Date().getFullYear()} CulturePulse</p>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link href="/" aria-label="CulturePulse home">
          <Logo />
        </Link>
        <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
            Sign in
          </Link>
          <PendingLink href={SIGNUP_HREF} className={buttonVariants()}>
            Start free
          </PendingLink>
        </div>
      </div>
    </header>
  );
}

function Step({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div>
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

/* ── Product previews ─────────────────────────────────────────────
   Built from the same structure as /dashboard/monitors and
   /dashboard/brand-audit, at readable size. Example data only.
   Radii are concentric: frame 16px − 8px padding = 8px inner panel. */

type Tier = "breakout" | "trending" | "rising";

const TIER: Record<Tier, { label: string; text: string; bar: string }> = {
  breakout: { label: "Breakout", text: "text-tier-breakout", bar: "bg-tier-breakout" },
  trending: { label: "Trending", text: "text-tier-trending", bar: "bg-tier-trending" },
  rising: { label: "Rising", text: "text-tier-rising", bar: "bg-tier-rising" },
};

const SIGNALS: {
  name: string;
  category: string;
  platforms: string[];
  score: number;
  velocity: number;
  crossPlatform: number;
  tier: Tier;
}[] = [
  { name: "Quiet luxury", category: "Fashion", platforms: ["Reddit", "TikTok", "Instagram"], score: 84, velocity: 38, crossPlatform: 88, tier: "breakout" },
  { name: "Dark academia", category: "Aesthetics", platforms: ["Reddit", "X", "Substack"], score: 61, velocity: 17, crossPlatform: 64, tier: "trending" },
  { name: "Van life", category: "Lifestyle", platforms: ["Reddit", "Instagram"], score: 47, velocity: 9, crossPlatform: 41, tier: "rising" },
];

function PreviewFrame({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <figure className="min-w-0">
      <div className="rounded-2xl border border-border bg-muted p-2 shadow-sm">
        <div className="overflow-hidden rounded-lg border border-border bg-card">{children}</div>
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

function SignalBoardPreview() {
  return (
    <div className="mt-16">
      <PreviewFrame caption="Signal Board, ranked by Breakout Score. Example data.">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="font-semibold">Signal Board</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-signal">1 breakout</span> across 3 monitored subcultures
            </p>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
            <span className="rounded-md bg-card px-3 py-1 font-medium shadow-sm">Breakout Score</span>
            <span className="px-3 py-1 text-muted-foreground">Velocity</span>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {SIGNALS.map((s) => {
            const t = TIER[s.tier];
            return (
              <li key={s.name} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 px-5 py-5 md:grid-cols-[1.4fr_1fr_1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <span className={cn("text-xs font-semibold", t.text)}>{t.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.category} · {s.platforms.join(", ")}
                  </p>
                </div>
                <Metric label="Velocity" className="hidden md:block">
                  <span className={cn("inline-flex items-center gap-1", t.text)}>
                    <TrendingUp className="h-4 w-4" aria-hidden />+{s.velocity}%
                  </span>
                </Metric>
                <Metric label="Cross-platform" className="hidden md:block">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", t.bar)} style={{ width: `${s.crossPlatform}%` }} />
                    </div>
                    <span className="tabular-nums">{s.crossPlatform}</span>
                  </div>
                </Metric>
                <div className="text-right">
                  <div className={cn("text-3xl font-semibold leading-none tracking-tight tabular-nums", t.text)}>
                    {s.score}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">score</div>
                </div>
              </li>
            );
          })}
        </ul>
      </PreviewFrame>
    </div>
  );
}

function Metric({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-sm font-medium tabular-nums", className)}>
      {children}
      <div className="mt-1 text-xs font-normal text-muted-foreground">{label}</div>
    </div>
  );
}

const AUDIT_DNA = [
  { name: "Van life", fit: 82 },
  { name: "Ultralight hiking", fit: 74 },
  { name: "Gorpcore", fit: 69 },
  { name: "Climate optimism", fit: 52 },
];

function BrandAuditPreview() {
  return (
    <PreviewFrame caption="Audience Audit for an outdoor brand. Example data.">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3 rounded-lg border border-input bg-background px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="flex-1 text-sm">@patagonia</span>
          <span className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}>Audit</span>
        </div>
      </div>
      <div className="p-5">
        <p className="text-sm font-semibold">Subculture DNA</p>
        <ul className="mt-4 space-y-3.5">
          {AUDIT_DNA.map((d) => (
            <li key={d.name} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="truncate">{d.name}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${d.fit}%` }} />
              </div>
              <span className="text-right tabular-nums text-muted-foreground">{d.fit}%</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
          <span>
            <span className="font-medium text-signal">New fit:</span> Bikepacking, growing{" "}
            <span className="tabular-nums">+24%</span> this month
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </div>
    </PreviewFrame>
  );
}
