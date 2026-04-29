import { getDashboardCardsUrl } from "./apiBase";

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

export async function fetchDashboardCards(siteId: string): Promise<DashboardCardsResponse> {
  const res = await fetch(getDashboardCardsUrl(siteId), {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`dashboard-cards: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<DashboardCardsResponse>;
}

/** API often returns hex without # — normalize for CSS */
export function normalizeAqiColorHex(aqiColor: string): string {
  const t = aqiColor.trim();
  if (!t) return "#888888";
  return t.startsWith("#") ? t : `#${t}`;
}
