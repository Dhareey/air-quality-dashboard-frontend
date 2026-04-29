import { getFilterConfigUrl } from "./apiBase";

/** Resolves to `{API_BASE}/filter_config` (see `NEXT_PUBLIC_API_BASE` in `apiBase.ts`). */
export const FILTER_CONFIG_URL = getFilterConfigUrl();

export type CountryKey = "nigeria" | "ghana";

export interface FilterSite {
  site_id: string;
  name: string;
  city: string;
  lastRawData: string;
}

/** Region name -> sites */
export type RegionMap = Record<string, FilterSite[]>;

export interface MergedFilterConfig {
  nigeria: RegionMap;
  ghana: RegionMap;
}

export type FilterConfigResponse = Array<{
  nigeria?: RegionMap;
  ghana?: RegionMap;
}>;

const REGION_SEP = "::";

export function makeRegionValue(countryKey: CountryKey, regionName: string) {
  return `${countryKey}${REGION_SEP}${regionName}`;
}

export function parseRegionValue(
  v: string
): { countryKey: CountryKey; regionName: string } | null {
  if (v === "all") return null;
  const i = v.indexOf(REGION_SEP);
  if (i < 0) return null;
  const countryKey = v.slice(0, i) as CountryKey;
  const regionName = v.slice(i + REGION_SEP.length);
  if ((countryKey !== "nigeria" && countryKey !== "ghana") || !regionName) return null;
  return { countryKey, regionName };
}

function mergeRegionMaps(
  a: RegionMap,
  b: RegionMap
): RegionMap {
  const out: RegionMap = { ...a };
  for (const [region, sites] of Object.entries(b)) {
    out[region] = [...(out[region] ?? []), ...sites];
  }
  return out;
}

export function mergeFilterConfigResponse(raw: FilterConfigResponse | null | undefined): MergedFilterConfig {
  const empty: MergedFilterConfig = { nigeria: {}, ghana: {} };
  if (!raw?.length) return empty;
  let nigeria: RegionMap = {};
  let ghana: RegionMap = {};
  for (const item of raw) {
    if (item.nigeria) nigeria = mergeRegionMaps(nigeria, item.nigeria);
    if (item.ghana) ghana = mergeRegionMaps(ghana, item.ghana);
  }
  return { nigeria, ghana };
}

export async function fetchFilterConfig(
  url: string = FILTER_CONFIG_URL
): Promise<MergedFilterConfig> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`filter_config: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as FilterConfigResponse;
  return mergeFilterConfigResponse(data);
}

type CountryFilter = "Nigeria" | "Ghana" | "Both";

function regionsForKey(config: MergedFilterConfig, key: CountryKey) {
  return Object.keys(config[key] ?? {})
    .sort()
    .map((regionName) => ({
      value: makeRegionValue(key, regionName),
      label: regionName,
      regionName,
    }));
}

export function listRegionOptions(
  config: MergedFilterConfig,
  country: CountryFilter
): { value: string; label: string; regionName: string }[] {
  if (country === "Nigeria") return regionsForKey(config, "nigeria");
  if (country === "Ghana") return regionsForKey(config, "ghana");
  const a = regionsForKey(config, "nigeria").map((r) => ({
    ...r,
    label: `${r.regionName} (Nigeria)`,
  }));
  const b = regionsForKey(config, "ghana").map((r) => ({
    ...r,
    label: `${r.regionName} (Ghana)`,
  }));
  return [...a, ...b].sort((x, y) => x.label.localeCompare(y.label));
}

export function collectSitesInScope(
  config: MergedFilterConfig,
  country: CountryFilter,
  regionValue: string
): FilterSite[] {
  const parsed = parseRegionValue(regionValue);
  if (parsed) {
    return config[parsed.countryKey][parsed.regionName] ?? [];
  }
  if (regionValue !== "all") return [];
  if (country === "Nigeria") {
    return Object.values(config.nigeria).flat();
  }
  if (country === "Ghana") {
    return Object.values(config.ghana).flat();
  }
  return [...Object.values(config.nigeria).flat(), ...Object.values(config.ghana).flat()];
}

export function getSiteIdsForRegionFilter(
  config: MergedFilterConfig,
  regionValue: string
): Set<string> {
  const parsed = parseRegionValue(regionValue);
  if (!parsed) return new Set();
  return new Set((config[parsed.countryKey][parsed.regionName] ?? []).map((s) => s.site_id));
}

export function getSiteDisplayName(
  config: MergedFilterConfig | null,
  siteId: string
): string | null {
  if (!config) return null;
  for (const key of ["nigeria", "ghana"] as const) {
    for (const sites of Object.values(config[key])) {
      const s = sites.find((x) => x.site_id === siteId);
      if (s) return s.name;
    }
  }
  return null;
}
