# CulturePulse: maintenance notes

Things to remember about how CulturePulse is set up. No passwords or keys are stored in this file.

_Last updated: November 11, 2026_

---

## Coming up

### Before launch: turn automatic monitor runs back on
- **Why it's off:** since Nov 11, 2026, monitors only run when you click **Run all now** (or a card's run button), to save Apify credit while we build. Each run of 5 monitors costs roughly $0.30–0.50 in Apify credit, mostly Reddit.
- **What you'll see while it's off:** the Signal Board says "Auto-runs paused · run manually". The 6-hourly scheduled job still fires but skips.
- **To turn it back on:** in `lib/monitor-schedule.ts`, change `MONITOR_AUTO_RUN = false` to `true`, then commit and push. That's the only change; the schedule in `vercel.json` is still there. Or ask Claude to "turn monitor auto-runs back on".
- **At launch, expect about $35–40/month in Apify credit** for 5 monitors running 4 times a day (more as monitors are added).

### Before launch: switch Stripe from Sandbox to live
- **Right now (since Nov 13, 2026):** Vercel Production uses Stripe **Sandbox** (test mode). Checkout only takes test cards (e.g. 4242 4242 4242 4242) and no real money moves.
- **What's set up in the Sandbox:** products Starter, Pro, Studio (monthly and yearly prices) and Brand Culture Snapshot ($499 one time); the coupon `snapshot-credit` ($499 off, once); and the webhook "culturepulse-billing" to `https://www.culture-pulse.com/api/billing/webhook` (4 events).
- **To go live:** in Stripe, switch to live mode and create the same products, prices, coupon and webhook (Stripe can copy products across). Then in Vercel, replace all 8 `STRIPE_PRICE_*` / `STRIPE_COUPON_SNAPSHOT_CREDIT` values with the live IDs, plus the 3 keys (`STRIPE_SECRET_KEY` starts `sk_live_`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts `pk_live_`, and the live webhook's `STRIPE_WEBHOOK_SECRET`). Redeploy afterwards. Or ask Claude to "move Stripe to live".

### Feb 7, 2027: the GitHub token expires

- **What you'll see:** `git push` stops working, with an "Authentication failed" error.
- **Fix (about 2 minutes):**
  1. Go to GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**.
  2. Open **"culturepulse git push (Mac)"** and click **Regenerate token** (pick 90 days).
  3. Copy the new token. **Don't paste it into a chat or the command line.**
  4. Run a push. When git asks for a password, paste the token there. Your Mac's Keychain remembers it.
- **Tip:** ask Claude to do this with the macOS pop-up box, which is easier than the hidden terminal prompt.

---

## Good to know

### Your local `.env` file points at the live database
- `DIRECT_URL` in `.env` points at the **production** database. It currently holds an old, dead password, so it can't connect, which is safe for now.
- **Before running database commands on your own computer** (`npx prisma migrate dev`, `npx prisma db push`), point `DIRECT_URL` at your local database. Otherwise those commands would change the live site's database.

### Two databases: production and preview
| | Neon branch | Used by |
|---|---|---|
| **Production** | `production` (`ep-odd-breeze…`) | the live site, culturepulse-ashy.vercel.app |
| **Preview** | `preview` (`ep-red-pine…`) | Vercel preview links for branches |

- Both live in the **culture pulse** project in your own Neon login. The "Neon × Vercel" login is a different, unused account.
- Vercel has a separate `DATABASE_URL` and `DIRECT_URL` for **Production** and for **Preview**.

### Database changes now go through migrations
- Since Nov 9, 2026, schema changes are saved as files in `prisma/migrations/` and applied automatically on every deploy.
- The old, outdated migration folders were moved to `../culturepulse-old-migrations` (next to the project folder). **Never copy them back.**

### Preview links work for every branch (fixed Nov 9, 2026)
- Previews no longer need a `NEXTAUTH_URL` setting; the app works out its own address on Vercel.
- Long branch names get a shortened preview address (e.g. `culturepulse-git-design-dashboard-2e129c-…`). Find it on the deployment in Vercel.

### Analytics (on since Nov 10, 2026)
- **Vercel → culturepulse → Analytics:** visitors, page views, top pages, referrers, countries. Cookieless, so no cookie banner is needed.
- **Vercel → culturepulse → Speed Insights:** real-visitor load speed.
- Uses the plan's included allowance; extra cost only past it ($30 per additional 1M events). Don't switch on "Web Analytics Plus" ($10/mo) unless you need it.
- Search terms and other URL query strings are stripped before anything is sent.

### Another Claude session works in this folder
- It pushes to `main` directly, sometimes while other work is in progress.
- It signs in to GitHub the same way you do (through your Mac's Keychain).

### Scheduled jobs are locked (fixed Nov 10, 2026)
- `/api/monitors/run` (every 6h) and `/api/digest` (Mondays) only run when called with `CRON_SECRET`, which Vercel's scheduler sends automatically. In production they refuse every call if the secret is ever missing.
- `CRON_SECRET` is a Secret in Vercel (Production). If you rotate it, just save the new value and redeploy.
- The Signal Board's "Run all now" uses its own signed-in route and runs only your own monitors.
- These routes also no longer run during builds. Before Nov 10, every production deploy sent a weekly-digest email (6 extra sends Nov 9–10).

### Parked: Compare (hidden 2026-11-13)
- Compare was removed from the top nav and from the Pro plan's feature list. The page (`/dashboard/compare`), its API and the old card/tray code are still in the project, just not linked.
- Why: it compares single platform communities (a subreddit, a hashtag), but the app now works in subcultures, and nothing could start a comparison.
- Plan to bring it back: rebuild it to compare 2–4 **subcultures**: tick boxes and a tray on the Library page, plus a "Compare with…" button on each subculture page. Use stored subculture data (language, psychographics, platforms, signals), so no extra Apify cost.
- When it returns: re-add the nav link in `components/nav-header.tsx` and "Compare" to the Pro features in `lib/plans.ts`.

### Open issue: Apify errors in the monitor job
- Production build logs show `Apify error 400` from the monitor snapshot job (the enricher code).
- Ask the session working on the enrichers to look into it.

---

## If a password or key ever leaks

Rotate it, then update every place that uses it:

| What | Rotate it in | Then update |
|---|---|---|
| Database password | Neon → culture pulse → branch → **Roles** → `neondb_owner` → Reset password (do **both** branches) | Vercel `DATABASE_URL` + `DIRECT_URL` (Production / Preview), then redeploy |
| GitHub token | GitHub → Fine-grained tokens → Regenerate | Paste at the next `git push` prompt |
| Anthropic API key | console.anthropic.com → API keys | Vercel `ANTHROPIC_API_KEY`, then redeploy |

**Note:** the live site can't reach its database between resetting the production password and redeploying, so do those steps back-to-back.

---

## Done on Nov 9, 2026 (for the record)
- Reset both database passwords after one leaked into a chat.
- Replaced the GitHub token that was stored in the git settings; the old token is deleted.
- Made `/api/status` admin-only, so it no longer shows part of the Anthropic key.
- Removed a saved permission rule that contained the database password.
