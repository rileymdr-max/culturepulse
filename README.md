# CulturePulse

A secure, real-time dashboard for monitoring micro-culture conversations and content across **Reddit**, **X/Twitter**, **TikTok**, **Instagram**, **Facebook**, and **Substack**.

Search any subculture, niche, or interest — see conversation categories, trending topics, top content, and key creators — then compare communities side-by-side.

---

## Features

- **Secure login** — credentials-based auth via NextAuth.js (JWT sessions)
- **Multi-platform search** — query all 6 platforms in parallel with a single search
- **Community detail** — hero stats, conversation category chart, trending topics with velocity, content grid, top voices
- **Compare view** — radar chart overlay + side-by-side columns with similarity scores (0–100)
- **Saved searches** — bookmark any query to your account, restore with one click
- **Live refresh** — community data auto-updates every 60 seconds via TanStack Query
- **Mock fallback** — the app works fully without any API keys (realistic seeded data)
- **Rate limiting** — per-user sliding window (in-memory or Upstash Redis)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom shadcn/ui components |
| Auth | NextAuth.js (JWT + Prisma adapter) |
| Database | PostgreSQL via Prisma ORM |
| Data fetching | TanStack Query (React Query v5) |
| Charts | Recharts |
| Rate limiting | In-memory (dev) / Upstash Redis (prod) |
| Containerisation | Docker Compose |

---

## Project structure

```
.
├── app/
│   ├── api/                    # API routes (auth, search, community, compare, trending, saved)
│   ├── dashboard/              # Protected dashboard pages
│   │   ├── page.tsx            # Search + trending home
│   │   ├── community/[id]/     # Community detail (live-refreshing)
│   │   └── compare/            # Side-by-side compare view
│   ├── login/                  # Login page
│   └── register/               # Registration page
├── components/
│   ├── ui/                     # Base UI primitives (Button, Card, Badge, etc.)
│   └── *.tsx                   # Feature components (SearchBar, CommunityCard, charts, etc.)
├── hooks/                      # TanStack Query hooks (useSearch, useCommunity, useCompare, …)
├── lib/
│   ├── platforms/              # Platform data layer
│   │   ├── types.ts            # Unified CommunityData schema
│   │   ├── index.ts            # Orchestrator (searchPlatforms, getCommunity, …)
│   │   ├── mock-helpers.ts     # Seeded mock data generators
│   │   └── {platform}/         # reddit | twitter | substack | tiktok | instagram | facebook
│   │       ├── live.ts         # Live API connector
│   │       ├── mock.ts         # Mock data generator
│   │       └── index.ts        # Routes live/mock based on env
│   ├── api-helpers.ts          # Session guard, rate limiter, error helpers
│   ├── auth.ts                 # NextAuth configuration
│   ├── env.ts                  # Zod env validation (runs at startup)
│   ├── prisma.ts               # Prisma client singleton
│   ├── similarity.ts           # Community similarity scoring
│   └── utils.ts                # cn(), formatNumber(), timeAgo()
├── prisma/
│   └── schema.prisma           # User, Session, SavedSearch, CommunityCache models
├── types/
│   └── next-auth.d.ts          # Session type augmentation
├── middleware.ts               # Route protection (withAuth)
├── docker-compose.yml          # Local PostgreSQL
└── .env.example                # All environment variables documented
```

---

## Local development setup

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for the local PostgreSQL container)

### 1. Clone and install

```bash
git clone <your-repo-url> culturepulse
cd culturepulse
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` — the minimum required values for local dev:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/culturepulse"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
FORCE_MOCK_DATA="false"
```

All platform API keys are optional — without them the app uses realistic mock data automatically.

### 3. Start the database

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432. Wait a few seconds for it to be ready.

### 4. Set up the database schema

```bash
npm run db:generate   # generates the Prisma client
npm run db:push       # creates tables (uses DATABASE_URL from .env.local)
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page — click **Create one** to register your first account.

---

## Configuring platform APIs

Each platform falls back to mock data when its credentials are missing. Configure them when you're ready for live data.

### Reddit

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Create a **script** type app
3. Copy the client ID (below the app name) and the client secret

```env
REDDIT_CLIENT_ID="your-client-id"
REDDIT_CLIENT_SECRET="your-client-secret"
REDDIT_USER_AGENT="CulturePulse/1.0 (by /u/YourUsername)"
```

### X / Twitter

1. Apply for API access at [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard)
2. Create a project + app with **Read** permissions
3. Generate a **Bearer Token**

```env
TWITTER_BEARER_TOKEN="your-bearer-token"
```

Rate limits: Free tier — 500k tweet reads/month. Basic — 10k/month. Paid tiers unlock more.

### Substack

**No API key needed.** Substack data is fetched from public RSS feeds + the public search endpoint. It works automatically.

### TikTok

The TikTok Research API requires institutional approval from TikTok (academic or business).

1. Apply at [developers.tiktok.com/products/research-api](https://developers.tiktok.com/products/research-api/)
2. Once approved, set:

```env
TIKTOK_CLIENT_KEY="your-client-key"
TIKTOK_CLIENT_SECRET="your-client-secret"
```

See `lib/platforms/tiktok/live.ts` for the full implementation guide including all endpoint details.

### Instagram

Requires a Meta Developer app + Facebook Business account + Instagram Professional account.

1. Create a Meta app at [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Add the **Instagram Graph API** product
3. Complete App Review for `instagram_basic` + `instagram_manage_insights` permissions
4. Generate a long-lived User Access Token
5. Find your Instagram Business Account ID

```env
INSTAGRAM_ACCESS_TOKEN="your-long-lived-token"
INSTAGRAM_BUSINESS_ACCOUNT_ID="your-numeric-account-id"
```

See `lib/platforms/instagram/live.ts` for step-by-step instructions.

### Facebook

Uses the same Meta Developer app as Instagram.

1. Add the **Pages API** product to your existing Meta app
2. Complete App Review for `pages_read_engagement` + `pages_read_user_content`
3. Generate a Page Access Token

```env
FACEBOOK_ACCESS_TOKEN="your-page-access-token"
FACEBOOK_APP_ID="your-app-id"
FACEBOOK_APP_SECRET="your-app-secret"
```

See `lib/platforms/facebook/live.ts` for step-by-step instructions.

---

## Rate limiting

By default, an in-memory sliding-window limiter is used (resets on server restart — fine for development).

For production, configure **Upstash Redis** for persistent, multi-instance rate limiting:

1. Create a free Redis database at [upstash.com](https://upstash.com)
2. Copy the REST URL and token:

```env
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

3. Install the optional packages:

```bash
npm install @upstash/ratelimit @upstash/redis
```

The rate limiter automatically switches to Upstash when these variables are present.

Default limits per user:

| Route | Limit |
|---|---|
| `POST /api/search` | 30 / minute |
| `GET /api/trending` | 30 / minute |
| `GET /api/community/:id` | 60 / minute |
| `POST /api/compare` | 20 / minute |
| `GET /api/saved` | 60 / minute |
| `POST /api/saved` | 20 / minute |

---

## Deploying to Vercel

1. Push your code to GitHub / GitLab / Bitbucket

2. Import the repository at [vercel.com/new](https://vercel.com/new)

3. Add all environment variables from `.env.example` in the Vercel project settings

4. For the database, use one of:
   - **Vercel Postgres** (built-in, easiest)
   - **Supabase** (free tier, generous limits)
   - **Railway** (straightforward PostgreSQL hosting)
   - **Neon** (serverless PostgreSQL, free tier)

   Update `DATABASE_URL` to point to your hosted database.

5. After first deploy, run the Prisma migration:

```bash
npx prisma db push --preview-feature
# or via Vercel CLI:
vercel env pull && npx prisma db push
```

6. Set `NEXTAUTH_URL` to your production domain:

```env
NEXTAUTH_URL="https://your-app.vercel.app"
```

7. Deploy — Vercel auto-detects Next.js and builds correctly.

---

## Available npm scripts

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Push schema to database (dev)
npm run db:migrate   # Create a named migration (production-safe)
npm run db:studio    # Open Prisma Studio (visual DB browser)
```

---

## Forcing mock data

Set `FORCE_MOCK_DATA="true"` in `.env.local` to make all platforms use mock data regardless of whether API keys are configured. Useful for UI development and testing.

---

## Environment variable reference

See [`.env.example`](./.env.example) for the complete annotated list of all variables.
