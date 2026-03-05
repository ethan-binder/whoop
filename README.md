# WHOOP Medication Tracker

Track your medications and supplements, then see how they correlate with your WHOOP recovery, sleep, and strain data.

## Features

- **WHOOP OAuth** — Sign in with your WHOOP account
- **Medication Tracking** — CRUD medications/supplements with dose units, log doses with timestamps
- **WHOOP Data Sync** — Pull last 30 days of recovery, sleep, and strain metrics
- **Correlation Insights** — Compare average recovery, sleep, HRV, RHR on days you took a medication vs days you didn't

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for Postgres)
- A WHOOP developer account with an OAuth app

## WHOOP OAuth App Setup

1. Go to [developer.whoop.com](https://developer.whoop.com) and create a developer account
2. Create a new application
3. Set the redirect URI to: `http://localhost:3000/api/auth/whoop/callback`
4. Note your **Client ID** and **Client Secret**
5. Request the following scopes: `read:profile`, `read:recovery`, `read:sleep`, `read:cycles`, `read:workout`, `offline`

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `WHOOP_CLIENT_ID` | Your WHOOP OAuth Client ID |
| `WHOOP_CLIENT_SECRET` | Your WHOOP OAuth Client Secret |
| `WHOOP_REDIRECT_URI` | OAuth callback URL (`http://localhost:3000/api/auth/whoop/callback`) |
| `SESSION_SECRET` | Random string for signing session cookies (generate with `openssl rand -hex 32`) |

## Quick Start

```bash
# 1. Start Postgres
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Smoke Test Flow

1. Click **Connect WHOOP** → log in with your WHOOP account
2. You'll be redirected to `/dashboard`
3. Click **Sync Last 30 Days** to pull your WHOOP data
4. Go to **Medications** → add a medication (e.g., "Magnesium", supplement, mg)
5. Log a few doses on specific dates
6. Go to **Insights** → select the medication → click **Analyze**
7. See the comparison table and charts

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4**
- **Prisma 7** + PostgreSQL
- **Recharts** for charts
- **date-fns** for date utilities

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── nav.tsx               # Navigation bar
│   ├── dashboard/            # Dashboard with WHOOP metrics summary
│   ├── meds/                 # Medication CRUD + dose logging
│   ├── insights/             # Correlation analysis + charts
│   └── api/
│       ├── auth/whoop/       # OAuth initiation + callback
│       ├── whoop/sync/       # WHOOP data sync endpoint
│       ├── meds/             # Medication CRUD API
│       ├── med-events/       # Dose event CRUD API
│       └── insights/         # Correlation computation API
├── lib/
│   ├── prisma.ts             # Prisma client singleton
│   ├── session.ts            # Cookie-based session management
│   └── whoop-client.ts       # WHOOP API client with token refresh
└── generated/prisma/         # Generated Prisma client
```

## License

MIT
