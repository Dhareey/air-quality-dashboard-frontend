import type { AQIRecord } from "@/lib/aqi";
import type { PmHourlyPoint } from "@/lib/insightStream";

type TrendPoint = { sortKey: string; tlabel: string; pm25: number };

/** Per-site points — mirrors single-site `PM25LineChart` series logic. */
function buildSiteTrendPoints(
  pmHourly: PmHourlyPoint[] | undefined,
  data: AQIRecord[],
  mode: "daily" | "hourly"
): TrendPoint[] {
  if (pmHourly && pmHourly.length > 0) {
    if (mode === "hourly") {
      return [...pmHourly]
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((p) => ({
          sortKey: p.time,
          tlabel: `${p.time.slice(5, 10)} ${p.time.slice(11, 16)}`,
          pm25: p.pm2_5,
        }));
    }
    const byDay = new Map<string, { sum: number; n: number }>();
    pmHourly.forEach((p) => {
      const d = p.time.slice(0, 10);
      const cur = byDay.get(d) ?? { sum: 0, n: 0 };
      cur.sum += p.pm2_5;
      cur.n += 1;
      byDay.set(d, cur);
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({
        sortKey: d,
        tlabel: d.slice(5),
        pm25: +(v.sum / v.n).toFixed(1),
      }));
  }
  const byDay = new Map<string, { sum: number; n: number }>();
  data.forEach((r) => {
    const d = r.time.slice(0, 10);
    const cur = byDay.get(d) ?? { sum: 0, n: 0 };
    cur.sum += r.pm25;
    cur.n += 1;
    byDay.set(d, cur);
  });
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => ({
      sortKey: d,
      tlabel: d.slice(5),
      pm25: +(v.sum / v.n).toFixed(1),
    }));
}

export type ComparisonSiteInput = {
  dataKey: string;
  displayName: string;
  pmHourly: PmHourlyPoint[];
  aqi: AQIRecord[];
};

/** Daily means (YYYY-MM-DD) for `POST /compare_sites`. */
export function buildDailyPmForCompare(
  s: Pick<ComparisonSiteInput, "pmHourly" | "aqi">
): { date: string; mean: number }[] {
  const points = buildSiteTrendPoints(
    s.pmHourly.length > 0 ? s.pmHourly : undefined,
    s.aqi,
    "daily"
  );
  return points.map((p) => ({ date: p.sortKey, mean: p.pm25 }));
}

export function mergeComparisonRows(
  sites: ComparisonSiteInput[],
  mode: "daily" | "hourly"
): { rows: Array<Record<string, string | number | null | undefined>>; canToggleHourly: boolean } {
  const canToggleHourly = sites.some((s) => s.pmHourly.length > 0);
  const effectiveMode: "daily" | "hourly" = canToggleHourly ? mode : "daily";
  const perSite = sites.map((s) => ({
    dataKey: s.dataKey,
    displayName: s.displayName,
    points: buildSiteTrendPoints(
      s.pmHourly.length > 0 ? s.pmHourly : undefined,
      s.aqi,
      effectiveMode
    ),
  }));
  const sortKeySet = new Set<string>();
  for (const ps of perSite) {
    for (const p of ps.points) sortKeySet.add(p.sortKey);
  }
  const sortedKeys = [...sortKeySet].sort((a, b) => a.localeCompare(b));
  const tlabelByKey = new Map<string, string>();
  for (const k of sortedKeys) {
    for (const ps of perSite) {
      const hit = ps.points.find((p) => p.sortKey === k);
      if (hit) {
        tlabelByKey.set(k, hit.tlabel);
        break;
      }
    }
  }
  const rows = sortedKeys.map((k) => {
    const row: Record<string, string | number | null | undefined> = {
      tlabel: tlabelByKey.get(k) ?? k,
    };
    for (const ps of perSite) {
      const hit = ps.points.find((p) => p.sortKey === k);
      row[ps.dataKey] = hit != null ? hit.pm25 : null;
    }
    return row;
  });
  return { rows, canToggleHourly };
}
