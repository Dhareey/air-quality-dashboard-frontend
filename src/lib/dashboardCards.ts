import { getDashboardCardsUrl } from "./apiBase";
import { runSequentially } from "./requestQueue";

const inflight = new Map<string, Promise<DashboardCardsResponse>>();

export interface AqiRangeBand {
  min: number;
  max: number | null;
}

/** Backend may use keys like u4sg for "unhealthy for sensitive" */
export type AqiRanges = Record<string, AqiRangeBand>;

export interface DashboardCardsResponse {
  aqi_color: string;
  aqi_category: string;
  aqi_color_name: string;
  aqi_ranges: AqiRanges;
  site_id: string;
  device_id: string;
  city: string;
  country: string;
  time: string;
  pm2_5_value: number;
  pm_10: number;
}

export function fetchDashboardCards(siteId: string): Promise<DashboardCardsResponse> {
  const cached = inflight.get(siteId);
  if (cached) return cached;
  const p = runSequentially(async () => {
    const res = await fetch(getDashboardCardsUrl(siteId), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`dashboard-cards: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as DashboardCardsResponse;
  });
  inflight.set(siteId, p);
  p.catch(() => {
    inflight.delete(siteId);
  });
  return p;
}

/** API often returns hex without # — normalize for CSS */
export function normalizeAqiColorHex(aqiColor: string): string {
  const t = aqiColor.trim();
  if (!t) return "#888888";
  return t.startsWith("#") ? t : `#${t}`;
}
