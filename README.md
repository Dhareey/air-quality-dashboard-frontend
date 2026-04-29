# AirSight — Air Quality Frontend

A **Next.js (App Router)** dashboard for exploring **PM2.5 / AQI** monitoring
data across Nigeria, Ghana and other African sites. The UI talks to a
self-hosted backend that streams insight data over **Server-Sent Events
(SSE)** and exposes a few REST endpoints for site cards, filters and
LLM-powered comparisons.

The app is configured as a **fully static export** (`next.config.mjs` →
`output: "export"`) and is deployed to **AWS Amplify Hosting**.

---

## Highlights

- **Per-site reports**: KPI cards, PM2.5 trend (daily/hourly), hourly diurnal
  pattern, AQI category distribution, AI-generated narrative bullets, and a
  data table — all driven by one streaming endpoint per site.
- **Comparison view** (2 or 3 sites): a single multi-line chart aligning the
  selected sites on a shared time axis, plus an AI comparison summary from
  `POST /compare_sites`.
- **Sequenced request layer**: every backend call is funneled through one
  global queue with spacing + 429 retry, so the backend is never asked to
  serve multiple requests in parallel from the same client. This is the
  key reason the app survives strict rate limits.
- **Strict-Mode safe**: shared in-memory stores deduplicate parallel hooks
  and React 18 Strict-Mode double-mounts, so each request really is sent
  once per (site, date range).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ Next.js (App Router, static export)                                  │
│                                                                      │
│  /              → DashboardPage                                      │
│  /agent         → AgentPage (Coming soon)                            │
│                                                                      │
│  ┌─────────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│  │ FilterPanel │───▶│ SiteReportBlock  │    │ ComparisonSection  │   │
│  └─────────────┘    │  - KpiCards      │    │  - PM25 multi-line │   │
│                     │  - PM2.5 Trend   │    │  - AI summary card │   │
│                     │  - Hourly chart  │    └────────────────────┘   │
│                     │  - AQI Pie       │                             │
│                     │  - InsightSec.   │                             │
│                     │  - DataTable     │                             │
│                     └──────────────────┘                             │
│                                                                      │
│  Hooks                       Stores / clients                        │
│  ────────────────────        ─────────────────────────               │
│  useFilterConfig    ─▶  fetchFilterConfig (REST)                     │
│  useDashboardCards  ─▶  fetchDashboardCards (REST + per-site cache)  │
│  useInsightStream   ─▶  insightStreamStore (one EventSource per key) │
│  postCompareSites   ─▶  POST /compare_sites (REST)                   │
│                                                                      │
│  All four route through requestQueue.ts (sequential + 429 backoff)   │
└──────────────────────────────────────────────────────────────────────┘
                                ▲
                                │ HTTPS / SSE
                                ▼
              ┌────────────────────────────────────┐
              │ Backend API (NEXT_PUBLIC_API_BASE) │
              │  GET  /filter_config               │
              │  GET  /dashboard-cards/{site_id}   │
              │  GET  /generate_insight (SSE)      │
              │  POST /compare_sites               │
              └────────────────────────────────────┘
```

### Request sequencing

Backends with strict per-IP rate limits do not like simultaneous calls.
This app intentionally serializes everything:

- **`src/lib/requestQueue.ts`** owns one promise chain.
  - `runSequentially(fn)` queues a `fetch` job; the chain only advances
    after the response (or a thrown error).
  - `runStreamSequentially(start)` queues an `EventSource` job; the chain
    only advances when the caller signals `done()` (on `complete` or
    `error`).
  - A **1.5 s spacer** runs between every job.
  - `fetchWithBackoff()` retries HTTP **429** with `1s → 2.5s → 5s`
    delays (or `Retry-After` if the server provides it).

- **`src/lib/insightStreamStore.ts`** keeps **one** `EventSource` per
  `(site_id, start_date, end_date)` key, multiplexes the events to all
  subscribers, and caches the final snapshot. Re-mounts (Strict Mode,
  the comparison view, route revisits) all share the same connection.

- **`src/lib/dashboardCards.ts`** has an in-flight + result cache keyed
  by `site_id`, so concurrent hooks never spawn duplicate requests.

A typical 3-site page load executes in this order, never overlapping:

```
filter_config → dashboard-cards/site1 → generate_insight?site=1 (SSE)
              → dashboard-cards/site2 → generate_insight?site=2 (SSE)
              → dashboard-cards/site3 → generate_insight?site=3 (SSE)
              → compare_sites
```

---

## Tech stack

- **Next.js 15** (App Router, static export)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4** + **shadcn-style UI primitives** in
  `src/components/ui/`
- **Recharts** for line / bar / pie charts
- **lucide-react** icons
- **EventSource** (browser API) for streaming insight data

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  → DashboardPage (route "/")
│   ├── agent/page.tsx            → AgentPage (route "/agent", Coming soon)
│   ├── layout.tsx                → root metadata + html/body shell
│   └── _DashboardPage.tsx        → dashboard composition
├── components/
│   ├── layout/                   → AppShell, AppSidebar
│   ├── dashboard/
│   │   ├── FilterPanel.tsx       → country / region / sites / date-range
│   │   ├── SiteReportPanel.tsx   → one report block per site
│   │   ├── KpiCards.tsx          → PM2.5 / PM10 / AQI cards
│   │   ├── Charts.tsx            → trend / hourly / pie / comparison
│   │   ├── InsightSection.tsx    → LLM bullets (capped to 5)
│   │   ├── ComparisonSection.tsx → 2/3-site comparison + AI summary
│   │   └── DataTable.tsx         → readings table
│   ├── agent/AgentChat.tsx
│   └── ui/                       → button, input, label, select
├── hooks/
│   ├── useFilterConfig.ts
│   ├── useDashboardCards.ts
│   └── useInsightStream.ts       → subscribes to insightStreamStore
├── lib/
│   ├── apiBase.ts                → ONE place for the API base + paths
│   ├── requestQueue.ts           → global sequencing + 429 backoff
│   ├── insightStreamStore.ts     → shared EventSource per (site,dates)
│   ├── insightStream.ts          → SSE payload types
│   ├── insightStreamQueue.ts     → re-export shim (back-compat)
│   ├── dashboardCards.ts         → /dashboard-cards client
│   ├── compareSites.ts           → /compare_sites client
│   ├── filterConfig.ts           → /filter_config client + helpers
│   ├── readingsToAqi.ts          → maps stream → AQI rows
│   ├── comparisonPm25.ts         → daily/hourly PM2.5 merge for chart + LLM
│   ├── aqi.ts                    → AQI category palette + types
│   ├── aqiCategoryMap.ts         → label → category mapping
│   └── utils.ts                  → cn() (clsx + tailwind-merge)
└── styles/globals.css            → Tailwind v4 + design tokens
```

---

## Environment configuration

All API URLs are derived from a single environment variable. Do **not**
hardcode hosts.

```env
# .env.local (gitignored)
NEXT_PUBLIC_API_BASE=https://api.your-backend.example
```

`src/lib/apiBase.ts` builds every URL from `NEXT_PUBLIC_API_BASE`:

| Helper                          | Resolves to                           |
|---------------------------------|---------------------------------------|
| `getFilterConfigUrl()`          | `{base}/filter_config`                |
| `getDashboardCardsUrl(siteId)`  | `{base}/dashboard-cards/{siteId}`     |
| `buildGenerateInsightUrl(...)`  | `{base}/generate_insight?...`         |
| `getCompareSitesUrl()`          | `{base}/compare_sites`                |

Because it’s prefixed with `NEXT_PUBLIC_`, the value is baked into the
client bundle at **build time**. To change it for production, set the
variable in the AWS Amplify console (or your CI) — no code change needed.

A template lives in [`.env.example`](./.env.example).

---

## Run locally

Requires **Node 20+** (Next.js 15) and npm.

```bash
# 1) Install dependencies
npm install

# 2) Configure the backend URL
cp .env.example .env.local
# then edit .env.local

# 3) Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run lint    # next lint
npm run build   # static export to ./out
```

---

## Build a static site

```bash
npm run build
```

The static site is emitted to `./out` (because of `output: "export"` in
`next.config.mjs`). `index.html` lives at the root of that folder. You
can host it from any static origin (S3 + CloudFront, Cloudflare Pages,
Netlify, GitHub Pages, etc.), but our deployment target is AWS Amplify.

---

## Deployment — AWS Amplify Hosting

This project is hosted on **AWS Amplify Hosting**, connected to GitHub.

### Why Amplify?

- **Git-driven CI/CD** out of the box: push to `main`, Amplify builds
  and rolls out the new static bundle behind CloudFront.
- **Branch-per-environment** support if you need preview environments.
- **Managed CloudFront + ACM TLS + custom domain** for a static export
  without setting up CloudFront/S3/ACM by hand.
- **Build-time environment variables** that are injected into the Next
  static build, so production points at the production API while local
  points at localhost — same code, different env.
- **No SSR / server cost**: because we use `output: "export"`, Amplify
  serves pure HTML/CSS/JS — there is no Lambda or always-on server, and
  no per-request billing for SSR.

### Underlying AWS services in use

- **Amplify Hosting** — orchestrates build, deploy, environment
  variables, and the route to CloudFront.
- **Amazon CloudFront** — global CDN that fronts the static bundle.
- **AWS Certificate Manager (ACM)** — TLS certificate for the custom
  domain (managed by Amplify).
- **CodeBuild** — runs the build steps defined in `amplify.yml`
  (managed by Amplify; you don’t configure it directly).
- **CloudWatch Logs** — captures the build/output logs accessible from
  the Amplify console.

The backend API is hosted separately (outside this repo). Common Amplify
patterns to pair it with: API Gateway + Lambda, an EC2/ECS service, or a
container service. The frontend is decoupled — it just needs the base URL.

### `amplify.yml`

The build is defined in `amplify.yml` at the repo root. Example:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: out
    files:
      - "**/*"
  cache:
    paths:
      - .npm/**/*
      - node_modules/**/*
      - .next/cache/**/*
```

### Deploying

1. Push the repo to GitHub.
2. In the AWS Amplify console, **Host web app** → connect the GitHub
   repo and the `main` branch.
3. Amplify auto-detects the Next.js build. Confirm the build settings
   point at `amplify.yml` (or paste the YAML above).
4. Set environment variables (App settings → Environment variables):
   - `NEXT_PUBLIC_API_BASE` — your production backend base URL (no
     trailing slash).
5. Trigger the first deployment. Subsequent pushes to `main`
   automatically rebuild and roll out.

### Custom domain

In the Amplify console: **Domain management** → connect a domain. Amplify
provisions an ACM TLS cert and binds it to CloudFront automatically.

---

## Backend contract (summary)

The frontend assumes a backend that exposes the following from
`NEXT_PUBLIC_API_BASE`:

- `GET /filter_config` — returns regions and sites for Nigeria/Ghana, used
  to populate the filter panel.
- `GET /dashboard-cards/{site_id}` — current PM2.5/PM10/AQI snapshot for
  the KPI cards. Includes `city`, `country`, `time`, `aqi_color`,
  `aqi_category`, etc.
- `GET /generate_insight?site_id&start_date&end_date` — **Server-Sent
  Events** stream. Emits these events:
  - `total_records`, `pm_hourly`, `pm_hour_aggregate`,
    `aqi_category_distribution`, `llm_summary`, `readings`, `complete`.
- `POST /compare_sites` — body:
  ```json
  {
    "first_site":  { "site_name": "...", "daily_pm": [{"date":"YYYY-MM-DD","mean":0}] },
    "second_site": { "site_name": "...", "daily_pm": [...] },
    "third_site":  { "site_name": "...", "daily_pm": [...] }   // optional
  }
  ```
  Response: `string[]` (LLM comparison bullets).

CORS must allow the deployed Amplify domain (and `http://localhost:3000`
for local development).

---

## Notable design choices

- **Single API base** — every URL is constructed in `apiBase.ts`. Switch
  environments by changing one env var.
- **Sequenced + spaced requests** — see `requestQueue.ts`. Worth the
  added latency to avoid `429`s and keep the backend happy.
- **Shared insight stream store** — see `insightStreamStore.ts`. Avoids
  duplicate `EventSource` connections for the same `(site_id, dates)` and
  keeps the snapshot cached so revisits are instant.
- **Static export for hosting simplicity** — no SSR runtime to operate or
  pay for. All dynamic data lives behind the API.
- **Strict Mode on** — surfaces lifecycle bugs in dev. The store/cache
  layer is built to be safe under double-mount.

---

## Scripts

| Command         | What it does                                  |
|-----------------|-----------------------------------------------|
| `npm run dev`   | Start the Next dev server on port 3000.       |
| `npm run lint`  | Run ESLint (`next lint`).                     |
| `npm run build` | Produce the static export under `./out`.      |
| `npm run start` | Run a production preview server (rarely used because we deploy a static bundle). |
