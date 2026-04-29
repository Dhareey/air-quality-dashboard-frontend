export type Country = "Nigeria" | "Ghana";

export type AQICategory =
  | "Good"
  | "Moderate"
  | "Unhealthy for Sensitive"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

export interface AQIRecord {
  id: string;
  time: string; // ISO
  /** Free text (e.g. Nigeria, Ghana, Kenya) from API or mock */
  country: string;
  city: string;
  /** State / area grouping aligned with filter_config */
  region: string;
  siteId: string;
  deviceId: string;
  pm25: number;
  pm10: number;
  category: AQICategory;
  colorName: string;
  lat: number;
  lng: number;
}

export const AQI_COLORS: Record<AQICategory, { token: string; label: string; hex: string }> = {
  Good: { token: "var(--aqi-good)", label: "Green", hex: "#5cb85c" },
  Moderate: { token: "var(--aqi-moderate)", label: "Yellow", hex: "#f0c419" },
  "Unhealthy for Sensitive": { token: "var(--aqi-sensitive)", label: "Orange", hex: "#f0932b" },
  Unhealthy: { token: "var(--aqi-unhealthy)", label: "Red", hex: "#e55039" },
  "Very Unhealthy": { token: "var(--aqi-very-unhealthy)", label: "Purple", hex: "#a55eea" },
  Hazardous: { token: "var(--aqi-hazardous)", label: "Maroon", hex: "#7b241c" },
};

export function categorize(pm25: number): AQICategory {
  if (pm25 <= 12) return "Good";
  if (pm25 <= 35) return "Moderate";
  if (pm25 <= 55) return "Unhealthy for Sensitive";
  if (pm25 <= 150) return "Unhealthy";
  if (pm25 <= 250) return "Very Unhealthy";
  return "Hazardous";
}

/** Aligned with backend filter_config so UI filters can resolve site_id / region */
const SITE_POOL: Array<{
  siteId: string;
  country: Country;
  region: string;
  city: string;
  lat: number;
  lng: number;
}> = [
  {
    siteId: "64d7bc75ed04f200139b5ffa",
    country: "Nigeria",
    region: "Federal Capital Territory",
    city: "Abuja",
    lat: 9.076,
    lng: 7.398,
  },
  { siteId: "64d3a92c47fc640013c6c284", country: "Nigeria", region: "Lagos", city: "Ikeja", lat: 6.6, lng: 3.35 },
  { siteId: "64d3ab2af5fc5e00133e7984", country: "Nigeria", region: "Lagos", city: "Lagos", lat: 6.45, lng: 3.39 },
  { siteId: "64d3abf8f5fc5e00133e799b", country: "Nigeria", region: "Lagos", city: "Agege", lat: 6.62, lng: 3.32 },
  { siteId: "6964ba4cfeaddd0014c41a68", country: "Nigeria", region: "Rivers", city: "Port Harcourt", lat: 4.83, lng: 7.03 },
  { siteId: "6964bc5bb5a37a00148521df", country: "Nigeria", region: "Rivers", city: "Port Harcourt", lat: 4.8, lng: 7.02 },
  { siteId: "64f9d051b9e98d001ac9e81c", country: "Ghana", region: "Greater Accra Region", city: "Accra", lat: 5.604, lng: -0.187 },
  { siteId: "64f9d112b9e98d001ac9e877", country: "Ghana", region: "Greater Accra Region", city: "Accra", lat: 5.58, lng: -0.2 },
  { siteId: "64f9d17ab9e98d001ac9e882", country: "Ghana", region: "Greater Accra Region", city: "Accra", lat: 5.61, lng: -0.16 },
  { siteId: "64f9d1a9b9e98d001ac9e892", country: "Ghana", region: "Greater Accra Region", city: "Accra", lat: 5.59, lng: -0.22 },
];

// Seeded pseudo-random for stable mock data
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Stable reference "now" for mock data and default filter ranges.
// Frozen so that statically-exported HTML (rendered at build time) matches the
// client hydration output exactly — avoids React hydration mismatches.
export const MOCK_REFERENCE_DATE = new Date(Date.UTC(2026, 3, 27));

export function generateMockData(count = 600): AQIRecord[] {
  const rand = seeded(42);
  const out: AQIRecord[] = [];
  const now = MOCK_REFERENCE_DATE.getTime();
  for (let i = 0; i < count; i++) {
    const loc = SITE_POOL[Math.floor(rand() * SITE_POOL.length)];
    const dayOffset = Math.floor(rand() * 60);
    const hour = Math.floor(rand() * 24);
    const time = new Date(now - dayOffset * 86400000 - hour * 3600000).toISOString();
    const isNg = loc.country === "Nigeria";
    // Higher baseline for Nigeria, weekly waves
    const base = isNg ? 38 : 22;
    const wave = Math.sin((dayOffset / 7) * Math.PI) * 18;
    const noise = (rand() - 0.5) * 30;
    const pm25 = Math.max(2, Math.round((base + wave + noise) * 10) / 10);
    // Mock PM10 derived from PM2.5 with a stable multiplier band.
    const pm10 = Math.max(pm25, Math.round(pm25 * (1.35 + rand() * 0.35) * 10) / 10);
    const category = categorize(pm25);
    out.push({
      id: `r-${i}`,
      time,
      country: loc.country,
      city: loc.city,
      region: loc.region,
      siteId: loc.siteId,
      deviceId: `DEV-${1000 + (i % 80)}`,
      pm25,
      pm10,
      category,
      colorName: AQI_COLORS[category].label,
      lat: loc.lat + (rand() - 0.5) * 0.03,
      lng: loc.lng + (rand() - 0.5) * 0.03,
    });
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export const MOCK_DATA = generateMockData();
