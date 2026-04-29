const DEFAULT_BASE = "http://127.0.0.1:8002";

/**
 * `NEXT_PUBLIC_API_BASE` (no trailing slash) — e.g. `https://api.example.com`
 * Set in `.env.local` (gitignored) or the host’s build environment.
 */
export function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_BASE).replace(/\/$/, "");
}

/** Absolute URL for a path under the API base (path must not start with a second “host”, e.g. `filter_config` or `dashboard-cards/id`). */
export function apiUrl(path: string): string {
  const p = path.replace(/^\//, "");
  return `${getApiBase()}/${p}`;
}

export function getFilterConfigUrl(): string {
  return apiUrl("filter_config");
}

export function getDashboardCardsUrl(siteId: string): string {
  return apiUrl(`dashboard-cards/${encodeURIComponent(siteId)}`);
}

export function getCompareSitesUrl(): string {
  return apiUrl("compare_sites");
}

export function buildGenerateInsightUrl(
  siteId: string,
  startDate: string,
  endDate: string
): string {
  const u = new URL(apiUrl("generate_insight"));
  u.searchParams.set("site_id", siteId);
  u.searchParams.set("start_date", startDate);
  u.searchParams.set("end_date", endDate);
  return u.toString();
}
