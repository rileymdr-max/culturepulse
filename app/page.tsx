import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, Search, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { PendingLink } from "@/components/pending-link";
import { DemoButton } from "@/components/demo";
import { DemoVideoButton } from "@/components/marketing/demo-video-button";
import { cn } from "@/lib/utils";
import { BRAND_ROOT, D, M, CARD, BTN_GO, BTN_INK, STICKER, Wordmark } from "@/components/marketing/brand";

const SIGNUP_HREF = "/register";
const DEMO_HREF = "https://calendly.com/rileymdr/30min";
const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-current px-7 py-[14px] text-[17px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";
const PLATFORMS = ["Reddit", "TikTok", "Instagram", "X", "Facebook", "Substack"];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardedAt: true },
    });
    // Onboarding is for new sign-ups; the admin account never needs it.
    redirect(user?.onboardedAt || isAdmin(session.user.email) ? "/dashboard" : "/onboarding");
  }

  return (
    <div
      className={cn(BRAND_ROOT, "min-h-screen overflow-x-hidden")}
    >
      <SiteNav />

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto grid max-w-[1360px] items-start gap-14 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-11 lg:px-11 lg:pb-24 lg:pt-12">
          <div>
            <h1 className={cn(D, "text-[64px] leading-[0.9] sm:text-[96px] xl:text-[120px] xl:leading-[0.88]")}>
              Every trend <br className="hidden sm:inline" />
              starts as a <br className="hidden sm:inline" />
              <span className="text-[#0B6B45]">subculture</span> <br className="hidden sm:inline" />
              <span className="bg-[linear-gradient(transparent_58%,#FFE14D_58%,#FFE14D_92%,transparent_92%)]">nobody&rsquo;s</span>{" "}
              watching.
            </h1>
            <p className="mt-7 max-w-[560px] text-lg leading-relaxed text-[#3B3832] sm:text-xl">
              CulturePulse reads the micro-communities where taste is made, scores which ones are about to break out,
              and writes the brief your team needs to show up first.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 lg:gap-x-2.5">
              <PendingLink href={SIGNUP_HREF} arrow className={cn(BTN_GO, "lg:px-5 lg:text-base")}>
                Find your first breakout
              </PendingLink>
              <DemoVideoButton className="lg:px-5 lg:text-base" />
              <a
                href={DEMO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(BTN_OUTLINE, "text-[#111110] hover:bg-[#111110] hover:text-[#F2EDE3] focus-visible:outline-[#0B6B45] lg:px-5 lg:text-base")}
              >
                Book a demo
              </a>
            </div>
            <p className="mt-4 text-sm text-[#66625A]">
              Free plan · No credit card ·{" "}
              <DemoButton className="inline-flex items-center gap-1.5 font-bold text-[#0B6B45] underline decoration-2 underline-offset-2 hover:text-[#111110]">
                Or explore the platform, no sign-up
              </DemoButton>
            </p>
            <p className={cn(M, "mt-10 text-xs uppercase tracking-[0.08em] text-[#66625A]")}>
              Listening across {PLATFORMS.join(" · ")}
            </p>
          </div>

          <HeroSignalCard />
        </section>

        {/* ── Demo video ── */}
        <section id="demo" className="scroll-mt-20 border-t-2 border-[#111110]">
          <div className="mx-auto max-w-[1360px] px-4 py-20 sm:px-6 lg:px-11 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <div>
                <span className={cn(STICKER, "-rotate-2 bg-[#FFE14D]")}>See it in action</span>
                <h2 className={cn(D, "mt-7 max-w-4xl text-5xl leading-[0.95] sm:text-6xl lg:text-7xl")}>
                  Two ways in. One <span className="text-[#0B6B45]">brief</span> out.
                </h2>
              </div>
              <p className="max-w-md text-lg leading-relaxed text-[#3B3832]">
                Describe any audience, or start from a brand&rsquo;s handle. Either way, CulturePulse finds the
                subculture and writes the brief. Under a minute, sound on.
              </p>
            </div>
            <figure className="mt-12">
              <div className={cn(CARD, "overflow-hidden")}>
                <video
                  className="block aspect-video w-full bg-[#F2EDE3]"
                  src="/videos/culturepulse-demo.mp4"
                  poster="/videos/culturepulse-demo-poster.jpg"
                  controls
                  playsInline
                  preload="metadata"
                  aria-label="CulturePulse product demo with voiceover"
                >
                  <track kind="captions" src="/videos/culturepulse-demo.en.vtt" srcLang="en" label="English" />
                </video>
              </div>
              <figcaption className={cn(M, "mt-4 text-[11px] text-[#66625A]")}>
                Product demo, 54 seconds. Example brands and data.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="scroll-mt-20 border-t-2 border-[#111110]">
          <div className="mx-auto max-w-[1360px] px-4 py-20 sm:px-6 lg:px-11 lg:py-24">
            <h2 className={cn(D, "max-w-3xl text-5xl leading-[0.95] sm:text-6xl lg:text-7xl")}>
              From a hunch to a <span className="text-[#0B6B45]">brief</span> in three moves
            </h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
              {[
                {
                  title: "Search a subculture",
                  body: "Type any niche (gorpcore, BookTok, quiet luxury) and get velocity, top voices, platform split and the vocabulary the community actually uses.",
                },
                {
                  title: "Monitor for breakouts",
                  body: "Pin communities to your Signal Board. Each gets a Breakout Score from velocity, momentum and cross-platform strength, and you’re emailed when it spikes.",
                },
                {
                  title: "Generate a brief",
                  body: "One click turns a signal into a strategy brief: platform-specific angles, creative hooks, brand-fit notes and an urgency score.",
                },
              ].map((s, i) => (
                <li
                  key={s.title}
                  className="md:border-l-2 md:border-[#111110] md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
                >
                  <span className={cn(D, "block text-7xl leading-none text-[#0B6B45]")}>0{i + 1}</span>
                  <h3 className={cn(D, "mt-5 text-3xl")}>{s.title}</h3>
                  <p className="mt-3 text-[17px] leading-relaxed text-[#3B3832]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Audience Audit ── */}
        <section id="features" className="scroll-mt-20 border-t-2 border-[#111110] bg-[#C7F2D9]">
          <div className="mx-auto grid max-w-[1360px] items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-11 lg:py-28">
            <div>
              <span className={cn(STICKER, "-rotate-3 bg-[#BBA8FF]")}>Audience Audit</span>
              <h2 className={cn(D, "mt-7 text-5xl leading-[0.95] sm:text-6xl lg:text-7xl")}>
                Enter a brand&rsquo;s handle. See which subcultures already love it.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#2E3A33]">
                Audience Audit maps a brand&rsquo;s social following to the subcultures inside it, scores the fit of each
                one, and surfaces adjacent communities you aren&rsquo;t reaching yet.
              </p>
              <ul className="mt-8 space-y-3 text-[17px]">
                {[
                  "Subculture DNA for any public brand handle",
                  "A fit score for every community in the brand’s audience",
                  "Adjacent communities the brand isn’t reaching yet",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#0B6B45]" strokeWidth={3} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <BrandAuditCard />
          </div>
        </section>

        {/* ── Supporting features ── */}
        <section className="border-t-2 border-[#111110]">
          <div className="mx-auto grid max-w-[1360px] gap-8 px-4 py-20 sm:px-6 md:grid-cols-3 lg:px-11 lg:py-24">
            {[
              {
                tag: "Library",
                bg: "bg-[#FFE14D]",
                title: "Subculture Library",
                body: "Profiles covering vernacular, cultural icons, behaviors, psychographics and brand-fit signals, built from real community data.",
              },
              {
                tag: "Briefs",
                bg: "bg-[#BBA8FF]",
                title: "Content Briefs",
                body: "Briefs built from live signal context, with platform angles, timing hooks and urgency scoring, in under two minutes.",
              },
              {
                tag: "Alerts",
                bg: "bg-[#C7F2D9]",
                title: "Alerts and weekly digest",
                body: "Breakout alerts the moment a monitored community spikes, plus a Monday digest of what moved across your board.",
              },
            ].map((f, i) => (
              <article
                key={f.title}
                className={cn(
                  CARD,
                  "p-7 transition-transform duration-200 hover:-translate-y-1",
                  i === 1 ? "md:rotate-1" : i === 2 ? "md:-rotate-1" : ""
                )}
              >
                <span className={cn(STICKER, f.bg, "px-3 py-1 text-xs shadow-none")}>{f.tag}</span>
                <h3 className={cn(D, "mt-5 text-3xl")}>{f.title}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-[#3B3832]">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="scroll-mt-20 border-t-2 border-[#111110] bg-[#FFFDF8]">
          <div className="mx-auto max-w-[1360px] px-4 py-20 sm:px-6 lg:px-11 lg:py-24">
            <h2 className={cn(D, "max-w-3xl text-5xl leading-[0.95] sm:text-6xl lg:text-7xl")}>
              Plans from <span className="text-[#0B6B45]">$0</span>. Upgrade when you need more depth.
            </h2>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PLAN_ORDER.map((id) => {
                const plan = PLANS[id];
                const featured = id === "pro";
                return (
                  <div
                    key={id}
                    className={cn(
                      CARD,
                      "relative flex flex-col overflow-visible p-6",
                      featured && "bg-[#0B6B45] text-white"
                    )}
                  >
                    {featured && (
                      <span className={cn(STICKER, "absolute -top-4 right-5 rotate-3 bg-[#FFE14D] px-3 py-1 text-xs text-[#111110]")}>
                        Recommended
                      </span>
                    )}
                    <h3 className={cn(D, "text-2xl")}>{plan.name}</h3>
                    <p className="mt-3 flex items-baseline gap-1">
                      <span className={cn(D, "text-5xl tabular-nums")}>${plan.price.toLocaleString("en-US")}</span>
                      {plan.price > 0 && (
                        <span className={cn("text-sm", featured ? "text-white/75" : "text-[#66625A]")}>/mo</span>
                      )}
                    </p>
                    <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
                      {plan.features.map((f) => (
                        <li key={f} className="flex gap-2.5">
                          <Check
                            className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-[#FFE14D]" : "text-[#0B6B45]")}
                            strokeWidth={3}
                            aria-hidden
                          />
                          {f}
                        </li>
                      ))}
                      {plan.comingSoon?.map((f) => (
                        <li key={f} className={cn("flex gap-2.5", featured ? "text-white/70" : "text-[#66625A]")}>
                          <span className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                          {f} (coming soon)
                        </li>
                      ))}
                    </ul>
                    <PendingLink
                      href={SIGNUP_HREF}
                      className={cn(
                        "mt-8 inline-flex w-full items-center justify-center rounded-full border-2 border-[#111110] px-5 py-3 text-[15px] font-bold transition-colors",
                        featured
                          ? "bg-[#FFE14D] text-[#111110] hover:bg-[#FFEA80]"
                          : "bg-transparent hover:bg-[#111110] hover:text-[#F2EDE3]"
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
        <section className="border-t-2 border-[#111110] bg-[#0B6B45] text-[#F2EDE3]">
          <div className="mx-auto flex max-w-[1360px] flex-col items-start gap-10 px-4 py-20 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-11 lg:py-24">
            <div>
              <h2 className={cn(D, "text-6xl leading-[0.9] sm:text-7xl lg:text-8xl")}>
                Find your first <br className="hidden sm:inline" />
                <span className="text-[#FFE14D]">breakout</span> today.
              </h2>
              <p className="mt-5 text-lg text-[#F2EDE3]/80">Start on the free plan with one monitor. No credit card required.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <PendingLink
                href={SIGNUP_HREF}
                arrow
                className={cn(BTN_GO, "bg-[#F2EDE3] text-[#111110] focus-visible:outline-[#F2EDE3]")}
              >
                Start free
              </PendingLink>
              <a
                href={DEMO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(BTN_OUTLINE, "text-[#F2EDE3] hover:bg-[#F2EDE3] hover:text-[#0B6B45] focus-visible:outline-[#F2EDE3]")}
              >
                Book a demo
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-[#111110]">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-6 px-4 py-8 text-sm text-[#66625A] sm:px-6 lg:px-11">
          <Wordmark />
          <nav className="flex gap-6">
            <a href="#how" className="hover:text-[#111110]">How it works</a>
            <a href="#pricing" className="hover:text-[#111110]">Pricing</a>
            <Link href="/login" className="hover:text-[#111110]">Sign in</Link>
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
    <header className="sticky top-0 z-30 border-b-2 border-[#111110] bg-[#F2EDE3]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1360px] items-center gap-9 px-4 sm:px-6 lg:px-11">
        <Link href="/" aria-label="CulturePulse home">
          <Wordmark />
        </Link>
        <nav className="hidden gap-7 text-[15px] font-medium text-[#66625A] md:flex">
          <a href="#demo" className="hover:text-[#111110]">Demo</a>
          <a href="#how" className="hover:text-[#111110]">How it works</a>
          <a href="#features" className="hover:text-[#111110]">Audience Audit</a>
          <a href="#pricing" className="hover:text-[#111110]">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <Link href="/login" className="hidden text-[15px] font-medium hover:text-[#0B6B45] sm:inline">
            Sign in
          </Link>
          <PendingLink href={SIGNUP_HREF} className={BTN_INK}>
            Start free
          </PendingLink>
        </div>
      </div>
    </header>
  );
}

/* ── Hero card: the breakout, then the rest of this week's dispatch ──
   Example data, matching the structure of /dashboard/monitors. */

const DISPATCH = [
  {
    n: "ii.",
    name: "Dark academia",
    note: "Substack essays feeding BookTok reading lists.",
    vocab: "“annotated copy” · “tweed season”",
    score: 61,
    tier: "Trending",
  },
  {
    n: "iii.",
    name: "Van life",
    note: "Build-log threads picking up on Instagram Reels.",
    vocab: "“stealth camper” · “off-grid office”",
    score: 47,
    tier: "Rising",
  },
];

function HeroSignalCard() {
  return (
    <figure className="relative min-w-0 pt-6 motion-safe:animate-[cp-rise_600ms_cubic-bezier(.2,.7,.2,1)_both]">
      <style>{`@keyframes cp-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
      <span className={cn(STICKER, "absolute right-4 top-0 z-10 rotate-6 bg-[#BBA8FF] sm:right-6")}>
        1 breakout this week
      </span>
      <div className={cn(CARD, "overflow-hidden lg:-rotate-[1.2deg]")}>
        <div className={cn(M, "flex gap-3 whitespace-nowrap border-b-2 border-[#111110] bg-[#C7F2D9] px-4 py-2.5 text-xs text-[#66625A]")}>
          <span className="font-medium text-[#0B6B45]">● Breakout detected</span>
          <span className="hidden sm:inline">· 4 min ago</span>
        </div>

        <div className="px-5 pb-2 pt-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className={cn(M, "text-[11px] font-medium uppercase tracking-[0.06em] text-[#0B6B45]")}>
                Fashion · Reddit, TikTok, IG
              </p>
              <p className={cn(D, "mt-1 text-[30px] leading-tight")}>Quiet luxury</p>
              <p className="text-[13px] text-[#66625A]">Breakout Score</p>
            </div>
            <p className={cn(D, "text-[80px] leading-[0.9] text-[#0B6B45] sm:text-[92px]")}>84</p>
          </div>
          <svg viewBox="0 0 300 52" preserveAspectRatio="none" className="mt-1 block h-[52px] w-full" aria-hidden>
            <path
              d="M0 46 L30 44 L60 42 L90 43 L120 37 L150 34 L180 28 L210 21 L240 15 L270 8 L300 3 L300 52 L0 52Z"
              fill="#C7F2D9"
            />
            <path
              d="M0 46 L30 44 L60 42 L90 43 L120 37 L150 34 L180 28 L210 21 L240 15 L270 8 L300 3"
              fill="none"
              stroke="#0B6B45"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <dl className="grid grid-cols-3 border-t-2 border-[#111110]">
          {[
            ["Velocity", "+38%"],
            ["Momentum", "72"],
            ["Cross-platform", "88"],
          ].map(([k, v], i) => (
            <div key={k} className={cn("px-4 py-2.5", i > 0 && "border-l-2 border-[#111110]")}>
              <dt className="text-xs text-[#66625A]">{k}</dt>
              <dd className={cn(D, "text-2xl tabular-nums")}>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-baseline justify-between border-t-2 border-[#111110] px-5 pb-2 pt-3">
          <p className={cn(D, "text-[22px]")}>Also in this week&rsquo;s dispatch</p>
          <span className={cn(M, "text-[11px] text-[#66625A]")}>No. 46</span>
        </div>
        <ul>
          {DISPATCH.map((d) => (
            <li
              key={d.name}
              className="grid grid-cols-[24px_1fr_auto] items-start gap-3 border-t-[1.5px] border-[#DDD6C8] px-5 py-3"
            >
              <span className="font-serif text-[17px] italic text-[#0B6B45]">{d.n}</span>
              <div className="min-w-0">
                <p className={cn(D, "text-[21px] tracking-[0.01em]")}>{d.name}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-[#4A463F]">{d.note}</p>
                <p className={cn(M, "mt-1 text-[11px]")}>{d.vocab}</p>
              </div>
              <div className="text-right">
                <p className={cn(D, "text-4xl leading-none tabular-nums")}>{d.score}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#66625A]">{d.tier}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className={cn(M, "mt-4 text-right text-[11px] text-[#66625A]")}>Example data</figcaption>
    </figure>
  );
}

/* ── Audience Audit card ── */

const AUDIT_DNA = [
  { name: "Van life", fit: 82 },
  { name: "Ultralight hiking", fit: 74 },
  { name: "Gorpcore", fit: 69 },
  { name: "Climate optimism", fit: 52 },
];

function BrandAuditCard() {
  return (
    <figure className="min-w-0">
      <div className={cn(CARD, "overflow-hidden lg:rotate-1")}>
        <div className="border-b-2 border-[#111110] p-4">
          <div className="flex items-center gap-3 rounded-full border-2 border-[#111110] bg-white px-4 py-2">
            <Search className="h-4 w-4 text-[#66625A]" aria-hidden />
            <span className="flex-1 text-[15px]">@patagonia</span>
            <span className="rounded-full bg-[#111110] px-4 py-1.5 text-sm font-bold text-[#F2EDE3]">Audit</span>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <p className={cn(D, "text-2xl")}>Subculture DNA</p>
          <ul className="mt-4 space-y-4">
            {AUDIT_DNA.map((d) => (
              <li key={d.name} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-[15px] sm:grid-cols-[9rem_1fr_3rem]">
                <span className="truncate">{d.name}</span>
                <div className="h-3 overflow-hidden rounded-full border-2 border-[#111110] bg-[#F2EDE3]">
                  <div className="h-full bg-[#0B6B45]" style={{ width: `${d.fit}%` }} />
                </div>
                <span className={cn(D, "text-right text-xl tabular-nums")}>{d.fit}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border-2 border-[#111110] bg-[#FFE14D] px-4 py-3 text-[15px]">
            <span>
              <span className="font-bold">New fit:</span> Bikepacking, growing{" "}
              <span className="tabular-nums">+24%</span> this month
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
          </div>
        </div>
      </div>
      <figcaption className={cn(M, "mt-4 text-[11px] text-[#2E3A33]")}>Audience Audit for an outdoor brand. Example data.</figcaption>
    </figure>
  );
}
