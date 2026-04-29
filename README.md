# AirSight — Air Quality Frontend (Next.js)

A static Next.js (App Router) port of the AirSight TanStack Start dashboard.
Configured to build to a fully static site (`next.config.mjs` uses `output: "export"`),
suitable for hosting on AWS Amplify, S3 + CloudFront, Cloudflare Pages, Netlify, etc.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build a static site

```bash
npm run build
```

The static site is emitted to the `out/` directory (configured by Next's
`output: "export"` mode). Upload that folder — its `index.html` lives at the root.

### AWS Amplify

In your Amplify build settings, set the artifact base directory to `out`.
Example `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: out
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
```

## Project structure

- `src/app/` — App Router routes (`/`, `/agent`) and root layout
- `src/components/layout/` — `AppShell`, `AppSidebar`
- `src/components/dashboard/` — KPI cards, charts, table, map, insights, filter panel
- `src/components/agent/` — `AgentChat`
- `src/components/ui/` — shadcn-style primitives (`button`, `input`, `label`, `select`)
- `src/lib/` — `utils`, `aqi` mock data, `useFilteredData`
- `src/hooks/` — `use-mobile`
- `src/styles/globals.css` — Tailwind v4 + design tokens
