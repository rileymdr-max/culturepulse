# CulturePulse Playbook

How the site is built, where its data comes from, how the scores work, what it runs on, and how to change it.

_Last updated: November 13, 2026_

> **This is a living document.** Every change to the site should update the matching section here, and add a line to the [Change log](#9-change-log) at the bottom. Claude is instructed to do this automatically (see `CLAUDE.md`). No passwords or keys go in this file.

**Companion file:** [MAINTENANCE-NOTES.md](MAINTENANCE-NOTES.md) holds the reminders and "if something breaks" checklists (token renewals, password rotation, open issues).

---

## Contents

1. [What CulturePulse is](#1-what-culturepulse-is)
2. [How the site is built](#2-how-the-site-is-built)
3. [Where the data comes from (scraping)](#3-where-the-data-comes-from-scraping)
4. [How Claude (AI) is used](#4-how-claude-ai-is-used)
5. [Scores and how they're calculated](#5-scores-and-how-theyre-calculated)
6. [Plans, limits and accounts](#6-plans-limits-and-accounts)
7. [Platforms and subscriptions](#7-platforms-and-subscriptions)
8. [How to update the site](#8-how-to-update-the-site)
9. [Change log](#9-change-log)

---

## 1. What CulturePulse is

CulturePulse is a rebuild of MullenLowe's **Speedbag** process as a subscription product (P Street Consulting). It finds subculture conversations *before* they go mainstream (the "24–72 hour head start") and turns them into content briefs a brand can act on.

It's organised in five layers:

| Layer | What it does | Status | Main code |
|---|---|---|---|
| 1. Subculture intelligence | Builds a profile for any subculture from live social data + AI | Built | `lib/subculture-enricher.ts`, `lib/subculture-generator.ts` |
| 2. Monitor engine | Re-scrapes each watched subculture on a schedule and stores snapshots | Built (auto-runs paused, see §8.4) | `lib/monitor-engine.ts` |
| 3. Acceleration scoring + alerts | Turns snapshots into Velocity, Momentum, Cross-Platform and Breakout Score; emails breakouts | Built | `lib/acceleration.ts`, `lib/email.ts` |
| 4. Content intelligence | Writes a creative brief from a subculture + its live signal | Built | `lib/content-intelligence.ts` |
| 5. Multi-tenant / white-label | Workspaces, branding, billing | Partly built (workspaces, branding, Stripe code; custom domain + API access "coming soon") | `app/api/workspaces`, `lib/plans.ts`, `lib/stripe.ts` |

**Live URLs:** https://www.culture-pulse.com (main) and https://culturepulse-ashy.vercel.app (Vercel's own address).

### The main screens (signed in)

| Screen | Path | What it does |
|---|---|---|
| Home / Discover | `/dashboard` | Type a subculture or idea → live scrape + AI profile ("Discover search") |
| Subculture library | `/dashboard/subcultures` | Saved subculture profiles (pre-built + custom). Without full-library access, locked profiles show a teaser and can be unlocked with a "pick" |
| Signal Board (Monitors) | `/dashboard/monitors` | Watched subcultures with Breakout Scores; "Run all now" |
| Briefs | `/dashboard/briefs` | AI content briefs. The list shows urgency filter tiles (All / 🔥 Act now / This week / Monitor) and a card per brief with its urgency, first line of "The moment", subculture, velocity and platform logos. Each brief opens as a visual page: urgency sticker, at-a-glance tiles (window, velocity, angle and platform counts), jump links, and colour-coded cards with real platform logos (Simple Icons, `components/platform-logo.tsx`) for the moment, angles (with a yellow "Example" box), platforms and brand fit. Layout lives in `components/brief-view.tsx`; "Copy as text" still gives the plain version |
| Brand Audit | `/dashboard/brand-audit` | Enter a brand's social handles → its "subculture DNA" + new discoveries. "Your brands" lists saved brands (removing one frees a brand slot); "Download PDF" prints the report |
| Audience | `/dashboard/audience` | Audience overlap by handle (shares the Brand Audit allowance) |
| Compare | `/dashboard/compare` | **Hidden for now.** Removed from the nav and the Pro plan list; the page still exists but nothing links to it. Plan: rebuild it to compare subcultures from the Library (see MAINTENANCE-NOTES) |
| Billing / Workspace / Admin | `/dashboard/billing`, `/workspace`, `/admin` | Plan, usage, Snapshot purchase; team and branding; sign-up approvals and setting plans by hand |

Public pages: homepage `/`, `/login`, `/register`, `/onboarding` (2 steps: brand-handle audit → results; accounts with no plan and no Snapshot first choose between buying a Snapshot and seeing plans), `/join/[token]` (workspace invites).

---

## 2. How the site is built

### Tech stack

| Piece | What we use | Notes |
|---|---|---|
| Framework | **Next.js 14** (App Router), TypeScript | Pages in `app/`, API routes in `app/api/` |
| Styling | Tailwind CSS + our own UI components (`components/ui`) | **F2 brand**: paper #F2EDE3, ink #111110, green #0B6B45, mint, yellow, lilac; Anton / DM Sans / JetBrains Mono; ink outlines with offset shadows. No blue/orange. Tokens in `app/globals.css`, recipes in `components/marketing/brand.tsx` |
| Database | **PostgreSQL on Neon**, via **Prisma** | Schema in `prisma/schema.prisma`; changes go through `prisma/migrations/` |
| Login | **NextAuth** (email + password, JWT sessions) | New sign-ups need admin approval; one-click read-only demo account |
| Hosting | **Vercel** (Pro) | Every push to `main` deploys production; other branches get preview links |
| Scheduled jobs | **Vercel Cron** (`vercel.json`) | Monitors every 6h, weekly digest Mondays 08:00 UTC |
| Scraping | **Apify** actors | See §3 |
| AI | **Anthropic Claude** (`claude-opus-5-5`) | See §4 |
| Email | **Resend** from `hello@culture-pulse.com` | Breakout alerts, weekly digest, sign-up approvals |
| Payments | **Stripe** | Checkout, customer portal, webhook in `app/api/billing/` |
| Charts | Recharts | |
| Data fetching in the browser | TanStack Query (`hooks/`) | |
| Analytics | Vercel Web Analytics + Speed Insights | Cookieless |

### How a request flows

```
Browser page (app/dashboard/...)
   → hook in hooks/ (TanStack Query)
   → API route in app/api/...           ← checks login, plan limits, demo read-only rules
   → lib/... (scraping via Apify, AI via Claude, scoring)
   → Prisma → Neon Postgres              ← results saved
```

### Folder map

| Folder | What's in it |
|---|---|
| `app/` | Every page and API route |
| `components/` | Shared UI (`ui/` = buttons, cards; `marketing/` = homepage + brand) |
| `hooks/` | Browser-side data hooks |
| `lib/` | The engine: scraping, AI, scoring, plans, email, auth |
| `lib/platforms/` | Older per-platform search layer (live + mock for each platform) |
| `prisma/` | Database schema and migrations |
| `scripts/` | Seed scripts, password/token rotation helpers |
| `public/` | Images, demo video files |

### Key database tables

`User` (with `plan`, `approvedAt`), `Subculture` (profiles; `status` = draft/approved/archived, `demoVisible` = whether demo sessions can see it, defaults true), `Monitor` (`demoVisible` defaults false — admin curates which monitors sync to demo), `ContentBrief` (`demoVisible` defaults false), `MonitorSnapshot` (one row per platform per run: post count, engagement, top posts), `AuditLog` (one row per brand audit run, stored JSON result; `demoVisible` defaults false), `SavedSearch`, `TrackedCommunity`, workspace/organisation tables.

### Mock data

Every platform has a `mock.ts` fallback. If keys are missing, or `FORCE_MOCK_DATA=true`, the app shows realistic made-up data instead of failing. Brand Audit also falls back to mock data if Apify or Claude are unavailable.

---

## 3. Where the data comes from (scraping)

We don't use the official social-media APIs (they're expensive or need approval). Instead we run **Apify actors** — ready-made scrapers hosted by Apify — and pay per run/result from Apify credit.

All calls go through one helper, `lib/apify.ts` → `runActor()`. It runs the actor, waits for it to finish, and returns the results. If a run times out it keeps whatever partial results were already saved (useful for TikTok). If a platform fails, the others still return.

### 3.1 Discover search + Monitors (the core signal)

Code: `lib/subculture-enricher.ts`. The search phrase is cut down to its key words first (filler words like "who", "online", "community" are dropped; the first 3 remaining words are used).

| Platform | Apify actor | What we ask for | What we measure |
|---|---|---|---|
| Reddit | `harshmaur/reddit-scraper` | 25 posts, relevance-sorted, past year | Posts grouped by subreddit; **engagement = upvotes + 3 × comments**; subreddit sizes |
| TikTok | `clockworks/tiktok-scraper` | 1 search, 15 results, 1 GB memory (~47s) | **Total views**; top hashtags; top videos by plays |
| X / Twitter | `apidojo/tweet-scraper` | 30 latest tweets | **Engagement = likes + 2 × retweets + replies** |
| YouTube | `streamers/youtube-scraper` | 10 videos, sorted by views | **Total views** |
| Instagram | `apify/instagram-scraper` | Hashtag page (two words joined, e.g. `#homecoffee`, falling back to one word), 20 posts from the last 7 days | Posting rate (posts/day) and, on monitors, **re-checked engagement** (see below) |
| Google Trends | `apify/google-trends-scraper` | Past 12 months, weekly | **Search interest 0–100** (latest full week); rising/stable/declining; related searches |

**Instagram engagement (monitors only):** a hashtag only lists its newest posts, which are minutes old with no likes yet. So each monitor run re-visits the posts the *previous* run found and measures likes + comments + shares + views÷10, per post per day since posting (×10 to keep precision). The first run has nothing to re-check, so it's left out of scores.

**Approximate costs:** Reddit ~$0.06 per search (billed per post); Google Trends ~$0.005 per term; a 5-monitor "Run all" ~$0.30–0.50, mostly Reddit.

### 3.2 Brand Audit + Audience

Code: `lib/platforms/audience-live.ts`, `lib/brand-audit.ts`. Scrapes posts *mentioning* the brand's handles, then matches hashtags/keywords against a library of known communities.

| Platform | Apify actor |
|---|---|
| X / Twitter | `apify/twitter-scraper` |
| Reddit | `apify/reddit-scraper` |
| TikTok | `clockworks/tiktok-scraper` |
| Instagram | `apify/instagram-scraper` |
| YouTube | `streamers/youtube-scraper` |
| Pinterest | `silentflow/pinterest-scraper-ppr` |

Each platform is capped at 4 communities before being sent to Claude so no one platform (especially X) dominates.

### 3.3 Other scrapers

| Feature | Actor | Code |
|---|---|---|
| Ad intel (what brands advertise to this audience) | `apify/facebook-ads-scraper` (public Meta Ad Library) | `lib/ad-library.ts` |
| Spike content (posts behind a spike) | twitter / reddit / tiktok / instagram scrapers | `app/api/spike-content/route.ts` |
| Older community search | `trudax/reddit-scraper-lite`, `apidojo/tweet-scraper`, `apify/instagram-profile-scraper`, etc. | `lib/platforms/*/live.ts` |

### 3.4 What's *not* live

- **Facebook organic** and **Substack** are mock / unused. (Facebook would need Meta app approval.)
- Official Reddit, X, TikTok and Instagram API keys are not used; Apify replaces them.

---

## 4. How Claude (AI) is used

All AI calls use model **`claude-opus-5-5`** with the `ANTHROPIC_API_KEY` stored in Vercel. Each call uses a "tool" schema so Claude returns structured data, not free text.

| Feature | File | Input | Output |
|---|---|---|---|
| **Subculture profile** | `lib/subculture-generator.ts` | Subculture name + the live scraped data from §3.1 | Keywords, vernacular, categorical behaviours, moments, media sources, icons, platforms, psychographics, adjacent subcultures, brand fit + red flags (Speedbag's 4-quadrant input doc) |
| **Brand Audit** | `lib/brand-audit.ts` (adaptive thinking) | Communities/topics from §3.2 | Audience summary, 5–8 matched subcultures with **match %**, newly discovered subcultures, platforms, themes |
| **Content brief** | `lib/content-intelligence.ts` (adaptive thinking) | Subculture profile + (if from a monitor) its Acceleration Signal and top posts | Headline, **urgency**, moment summary, content angles, platform strategy, brand fit |

Prompt rules worth knowing: Brand Audit weights platforms equally and tells Claude not to let X dominate; match % must be "realistic, not flattering". A brief with no live signal defaults to "Monitor" urgency.

---

## 5. Scores and how they're calculated

### 5.1 Acceleration Signal (Signal Board, subculture pages, briefs, alerts)

Code: `lib/acceleration.ts`. Built from a monitor's stored snapshots (last ~60 rows ≈ 10 runs). For each platform the "count" is its **engagement** number from §3.1 (falls back to post count for old rows).

| Score | How it's calculated |
|---|---|
| **Velocity** (per platform) | Latest run vs. the average of the previous up-to-7 runs: `(latest − avg) ÷ avg × 100`. Needs 2+ runs. |
| **Velocity** (overall) | Average of the per-platform velocities that have data |
| **Momentum** | On the platform with the most history: compare the average of the newer half of runs with the older half. >10% up = **Rising**, >10% down = **Falling**, else **Stable**. Needs 4+ runs. |
| **Cross-Platform Strength** (0–100) | Do platforms agree? 1 platform = 30. If all (or a majority of 2+) are rising: geometric mean of the rising velocities ÷ 1.5 × share rising, max 100. All cooling = 15. Disagreeing = 20. |
| **Breakout Score** (0–100) | 50% velocity score (−20% → 0, +60% → 100) + 25% momentum (Rising 100 / Stable 50 / Falling 20) + 25% cross-platform |
| **Breakout?** | Breakout Score ≥ 70 **or** overall velocity ≥ 50% |

### 5.2 Signal tiers (labels on the Signal Board)

Code: `lib/signal-tier.ts`.

| Tier | Rule |
|---|---|
| Breakout | Breakout? is true |
| Trending | Breakout Score ≥ 55 |
| Rising | Breakout Score ≥ 35, or velocity > +5% |
| Cooling | Velocity < −5% |
| Stable | Anything else |

### 5.3 Breakout alerts

After each monitor run, if the monitor is a breakout and no alert went out in the last 24 hours, the owner gets an email (Pro and Studio plans only). Code: end of `runMonitor` in `lib/monitor-engine.ts`.

### 5.4 Weekly digest score

Code: `computeAccelerationScore` in `lib/monitor-engine.ts`. A simplified Breakout Score for ranking monitors in the Monday email: velocity of one engagement stream mapped −20% → 0, +60% → 100.

### 5.5 Brief urgency

Chosen by Claude when it writes the brief. **Act now** = 24–72 hour window; **This week** = 7-day window; **Monitor** = signal still building. Labels in `lib/brief-urgency.ts`.

### 5.6 Brand Audit match %

Set by Claude (1–100) from the scraped signals, labelled **strong / moderate / emerging**. Before Claude, communities are ranked by how many scraped hashtags/keywords match each one, and an **overlap %** is estimated from that rank (`lib/platforms/audience-live.ts`).

### 5.7 Spikes (tracked communities)

Code: `lib/spike-detection.ts`. Compares the last two snapshots of a tracked community:

| Spike | Rule | High if |
|---|---|---|
| New topic | Topic not in the previous snapshot | Always high |
| Rising topic | Jumped 2+ places in the ranking | 3+ places |
| Category surge | Category volume up 30%+ | 75%+ |
| Size surge | Community size up 5%+ | 15%+ |

### 5.8 Similarity score (Compare)

Code: `lib/similarity.ts`. 0–100 = 40% topic overlap (shared trending topics) + 30% conversation-category pattern + 20% size closeness (log scale) + 10% if same platform.

### 5.9 Google Trends direction

Average of the latest 4 weeks vs. the first 4 weeks of the year: >15% higher = rising, >15% lower = declining.

---

## 6. Plans, limits and accounts

Code: `lib/plans.ts` (plans, Snapshot, sales link), `lib/plan-usage.ts` (counting and checks). Monthly limits reset on the 1st of each month (UTC). Brand Audits and custom subcultures are counted in the `UsageEvent` table. Audits count **per brand**: re-running a brand already audited this month doesn't use up another audit.

**There is no free plan.** An account without a subscription ("No plan", stored as `free`) can only browse library teasers. The paid way in is the one-time **Brand Culture Snapshot**.

| | Starter | Pro | Studio | Enterprise |
|---|---|---|---|---|
| Price / month | $299 | $899 | $2,500 | From $6,000, annual contract (sales call) |
| Annual billing | $2,990/yr | $8,990/yr | $25,000/yr | In contract |
| Brand slots | 1 | 3 | 10 | Unlimited |
| Brands audited / month | 1 | 5 | 25 | Unlimited |
| Library | 10 profiles you pick | Full | Full | Full + custom research |
| Custom subcultures / month | – | 3 | 15 | Unlimited |
| Active monitors | 3 | 10 | 50 | Unlimited |
| Briefs / month | 5 | 30 | Unlimited | Unlimited |
| Seats (incl. owner) | 1 | 3 | 10 | Unlimited |
| Workspaces | – | 1 | 10 | Unlimited |
| Discover search, weekly digest, full acceleration scores | ✓ | ✓ | ✓ | ✓ |
| Breakout alerts (Compare when it returns) | – | ✓ | ✓ | ✓ |
| White-label branding | – | – | ✓ | ✓ |

**How the limits work:**
- **Brand slot:** each brand with a saved audit holds one. Re-auditing a brand you already have doesn't need a new slot. Removing a brand under "Your brands" on the Brand Audit page frees its slot.
- **Brands audited / month:** the number of *different* brands audited this month. Re-runs of a brand already counted are free, but each brand can be re-run at most once every 24 hours (`BRAND_RERUN_HOURS` in `lib/plan-usage.ts`), because every run costs Apify and Claude.
- **Library picks:** Starter picks 10 full profiles. A pick can be swapped out 30 days after it was added. Monitors and briefs only work on profiles the account can open.
- **Seats:** the owner plus everyone in, or invited to, workspaces they own. Each person counts once.
- **Enterprise:** has no checkout. "Talk to us" opens the Calendly link (`SALES_URL`). After the contract is signed, set the account's plan by hand in Admin → Sign-ups (plan dropdown). The change shows up for them within about 30 seconds, with no need to sign out. Accounts paying through Stripe change plans in Stripe instead.
- Studio's internal id is still `agency` (database + `STRIPE_PRICE_AGENCY`). Don't rename the id. Enterprise "API access" and "SSO" are advertised as "coming soon".
- The admin account always gets Enterprise.

**Brand Culture Snapshot ($499, one-time):** one Brand Audit credit, a PDF of the report (browser "Save as PDF"), and 3 library picks. If the buyer starts a plan within 30 days, Stripe takes $499 off the first payment, using the coupon in `STRIPE_COUPON_SNAPSHOT_CREDIT`. When the plan's own audits run out, Snapshot credits are used instead.

**Not built yet (planned):** paid add-ons (extra brand slot $99, or $79 on Studio; 5 extra audits $149; extra custom subculture $99).

**Accounts:**
- **Sign-up approval:** new users can't sign in until approved in Admin → Sign-ups. Workspace invitees and the admin are auto-approved.
- **Demo account** (`demo@culture-pulse.com`, "Explore the platform" button): read-only snapshot of the admin account's curated data. It can't trigger Apify or Claude, so it costs nothing. Any new read-only page must be added to the allowlist in `lib/demo-policy.ts` or it breaks for demo visitors.
  - **Curation:** in Admin → Demo, toggle which monitors, briefs, and audit runs appear in the demo (Eye/EyeOff per item). Click "Update demo now" to push your selections — the demo only updates when you do this (no longer auto-refreshes hourly). `demoVisible` defaults to `false` for new items so nothing leaks in by accident.
  - **What it shows:** only items flagged `demoVisible=true` on the source account are copied. Subcultures have a separate `demoVisible` toggle in Admin → Subculture Library (defaults `true`; approved + demoVisible entries only).
  - **Source account:** controlled by `DEMO_SOURCE_EMAIL` env var (defaults to `rileymdr@gmail.com`).

---

## 7. Platforms and subscriptions

What the project runs on. **Check the actual plan and billing in each dashboard** — prices change; update this table when they do.

| Service | What it's for | Plan / cost notes | Where to manage it | Settings it needs (in Vercel) |
|---|---|---|---|---|
| **Vercel** | Hosting, deploys, cron jobs, analytics | **Pro** plan. Analytics within included allowance; don't turn on "Web Analytics Plus" ($10/mo) unless needed | vercel.com → project **culturepulse** | — |
| **Neon** | Postgres database (production + preview branches) | Project **culture pulse**, in your own Neon login (not the "Neon × Vercel" one) | console.neon.tech | `DATABASE_URL`, `DIRECT_URL` (separate for Production and Preview) |
| **Apify** | All social scraping (§3) | Pay-as-you-go credit. ~$35–40/month expected once auto-runs are on (5 monitors × 4/day), more with more monitors/users | console.apify.com | `APIFY_API_TOKEN` |
| **Anthropic** | Claude for profiles, audits, briefs (§4) | Pay per use | console.anthropic.com | `ANTHROPIC_API_KEY` |
| **Resend** | Email (alerts, digest, approvals) | Sending domain `culture-pulse.com` verified | resend.com | `RESEND_API_KEY`, `RESEND_FROM` |
| **Stripe** | Subscriptions / payments | Checkout + portal + webhook built | dashboard.stripe.com | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/PRO/AGENCY` (monthly), `STRIPE_PRICE_STARTER_ANNUAL/PRO_ANNUAL/AGENCY_ANNUAL`, `STRIPE_PRICE_SNAPSHOT` (one-time $499), `STRIPE_COUPON_SNAPSHOT_CREDIT` ($499 off, once), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **GitHub** | Code storage (`rileymdr-max/culturepulse`) | Push token **expires Feb 7, 2027** (see MAINTENANCE-NOTES) | github.com | — |
| **Squarespace** | Domain registration + DNS for `culture-pulse.com` | Annual domain renewal | squarespace.com → Domains | — |
| **Claude (Anthropic) subscription** | Claude Code / desktop app used to build the site | Your Claude plan | claude.ai | — |
| **ElevenLabs** | Voice-over for the demo video (voice "Matilda") | Paid plan (commercial use) | elevenlabs.io | Key lives in the demo-video folder, not the site |
| **Remotion** | Builds the demo video (sibling folder `culturepulse-demo-video`) | Free software | — | — |
| **Upstash Redis** (optional) | Rate limiting across servers | Not currently set up; app uses in-memory limits | upstash.com | `UPSTASH_REDIS_REST_URL/TOKEN` |

Other required Vercel settings: `NEXTAUTH_SECRET` (login), `CRON_SECRET` (locks the scheduled jobs), `DEMO_SOURCE_EMAIL` (optional, which account the demo copies).

**Not used / not needed:** official Reddit, X, TikTok, Instagram and Facebook API keys (Apify replaces them); Vercel KV/Postgres.

---

## 8. How to update the site

### 8.1 With Claude (the usual way)

1. Open the **Claude desktop app → Code tab** in the project folder (`Claude Speedbag Project`).
2. Describe the change in plain words, e.g. *"Add a Compare button to the search results"* or *"Change the Pro price to $899."*
3. Claude edits the code, checks it in the built-in browser preview, and updates this playbook.
4. Review what changed, then say **"commit and push"**. Pushing to `main` deploys to the live site in ~2 minutes.
5. For bigger or riskier changes, ask Claude to **"do this on a branch"** (it uses a separate worktree). You get a Vercel **preview link** to check before merging.

Useful things to ask Claude:
- "Turn monitor auto-runs back on" (before launch)
- "Why is the Signal Board showing X?" / "Check the Vercel logs for errors"
- "Update the playbook" (if something was missed)
- "Rotate the Apify token" (there's a helper script: `scripts/rotate-apify-token.sh`)

Tips: never paste passwords or keys into the chat — paste them straight into Vercel/the website. Another Claude session may also be working in this folder, so ask for a branch if two things are happening at once.

### 8.2 Without Claude

**One-time setup on a computer:** install Node.js 18+, Git, and Docker Desktop (for a local database). Then in Terminal:

```bash
git clone https://github.com/rileymdr-max/culturepulse.git
```

```bash
cd culturepulse && npm install
```

Copy `.env.local.example` to `.env.local` (mock data mode works with no keys). Start a local database with `docker-compose up -d`, then `npx prisma migrate deploy`.

**Make a change:**

```bash
npm run dev
```

Open http://localhost:3000, edit files (common spots below), and the page reloads as you save. Then:

```bash
git add -A && git commit -m "Describe the change"
```

```bash
git push
```

Vercel deploys automatically. Watch it at vercel.com → culturepulse → Deployments; if a build fails, the log there shows why.

**Common edits and where they live:**

| To change… | Edit |
|---|---|
| Plan prices, limits, feature lists | `lib/plans.ts` (and the Stripe price in the Stripe dashboard) |
| Homepage copy | `app/page.tsx`, `components/marketing/` |
| Colours / fonts | `app/globals.css`, `components/marketing/brand.tsx` |
| Turn monitor auto-runs on/off | `lib/monitor-schedule.ts` → `MONITOR_AUTO_RUN` |
| How often monitors / digest run | `vercel.json` (UTC cron times) |
| Score thresholds | `lib/acceleration.ts`, `lib/signal-tier.ts` |
| AI instructions | `SYSTEM_PROMPT` in `lib/subculture-generator.ts`, `lib/brand-audit.ts`, `lib/content-intelligence.ts` |
| Which scraper / how many results | `lib/subculture-enricher.ts` |
| Email wording | `lib/email.ts` |
| A setting/key | Vercel → culturepulse → Settings → Environment Variables, then **Redeploy** |

**Database changes:** edit `prisma/schema.prisma`, run `npx prisma migrate dev --name what-changed` **only after** checking `DIRECT_URL` in `.env` points at your local database (otherwise it changes the live one). Commit the new folder in `prisma/migrations/`; production applies it on deploy.

**Undo a bad deploy:** Vercel → culturepulse → Deployments → pick the last good one → **⋯ → Promote to Production**. Then fix the code.

### 8.3 Before launch checklist

- [ ] Set `MONITOR_AUTO_RUN = true` in `lib/monitor-schedule.ts`
- [ ] Stripe in live mode with real price ids
- [ ] In Stripe, create: monthly prices Starter $299 / Pro $899 / Studio $2,500; annual prices $2,990 / $8,990 / $25,000; a one-time $499 "Brand Culture Snapshot" price; a $499-off "once" coupon. Put their ids in the Vercel settings listed in §7
- [ ] Update the existing Pro price in Stripe from $799 to $899 (new price id)
- [x] Hide Compare (done 2026-11-13; rebuild for subcultures later)
- [ ] Look into the `Apify error 400` in the monitor job logs
- [ ] Top up / set a budget alert on Apify and Anthropic

### 8.4 Current state of scheduled jobs

| Job | Schedule (UTC) | Status |
|---|---|---|
| `/api/monitors/run` | Every 6 hours | **Paused** since Nov 11, 2026 (fires, then skips). Run manually with "Run all now". |
| `/api/digest` | Mondays 08:00 | On |

---

## 9. Change log

Newest first. One line per change that affects anything in this playbook.

| Date | Change |
|---|---|
| 2026-11-13 | Compare hidden: removed from the top nav and from the Pro plan's feature list, since nothing in the app could start a comparison. To come back later as a subculture comparison on the Library page. |
| 2026-11-13 | Briefs list redesigned: urgency filter tiles and brief cards with a teaser line and platform logos. |
| 2026-11-13 | Brief pages redesigned: same text, now laid out as cards with icons, colour-coded sections and quick stats so they read lighter. |
| 2026-11-13 | Pricing v2: no free plan; one-time $499 Brand Culture Snapshot as the paid way in; plans now count brand slots, library picks, custom subcultures and seats; Pro $899; new Enterprise tier (sales call, set by hand in Admin); annual billing with 2 months free. Brand Audits now count per brand per month (re-runs of the same brand are free, once a day). |
| 2026-11-12 | Admin-controlled demo curation: `demoVisible` flags added to Monitor, ContentBrief, AuditLog. Admin → Demo tab lets you toggle per-item and push to demo on demand ("Update demo now"). Auto-hourly sync removed. |
| 2026-11-12 | Admin "View full profile" deep-link on audit history rows. Brand-audit page loads any saved run from URL `?id=`. Admin can view any user's audit log. |
| 2026-11-12 | Brand Audit history panel: "Previous runs" dropdown lets you reload any past audit without re-running. Auto-add: discovered subcultures from audits are silently saved as library drafts for admin review. Demo curation: `demoVisible` field on Subculture; admin can toggle per-subculture in Library tab; demo sessions see only approved + demoVisible subcultures. |
| 2026-11-12 | All emails (breakout alert, weekly digest, sign-up and approval) now use the F2 brand. Email links point to the live site address instead of the old Vercel address. |
| 2026-11-11 | MAINTENANCE-NOTES.md and the token/password rotation scripts now backed up on GitHub. |
| 2026-11-11 | Playbook created. |
| 2026-11-11 | Onboarding reworked to audit-first; homepage demo video + hero pop-up. |
| 2026-11-11 | Pricing tightened; Agency renamed Studio. Sign-up approval + read-only demo account. |
| 2026-11-11 | Monitor auto-runs paused. Reddit switched to `harshmaur/reddit-scraper`. Instagram engagement now measured by re-checking last run's posts. |
| 2026-11-11 | F2 brand applied across the signed-in app. `culture-pulse.com` connected; Resend domain verified. |
| 2026-11-10 | Vercel Analytics + Speed Insights on. Cron jobs locked with `CRON_SECRET`. |
| 2026-11-09 | Database moved to tracked migrations; preview database branch added; credentials rotated. Content briefs (Layer 4) shipped. |
