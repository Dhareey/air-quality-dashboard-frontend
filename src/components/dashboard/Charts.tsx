"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { AQI_COLORS, type AQIRecord, type AQICategory } from "@/lib/aqi";
import { mapApiAqiLabelToCategory } from "@/lib/aqiCategoryMap";
import { Button } from "@/components/ui/button";
import type { PmHourlyPoint, PmHourAggregatePoint, AqiCategoryBucket } from "@/lib/insightStream";
import { mergeComparisonRows, type ComparisonSiteInput } from "@/lib/comparisonPm25";

function Panel({
  title,
  subtitle,
  titleRight,
  children,
}: {
  title: string;
  subtitle?: string;
  titleRight?: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {titleRight}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function mergeAqiDistribution(buckets: AqiCategoryBucket[]) {
  const m = new Map<AQICategory, number>();
  for (const b of buckets) {
    const k = mapApiAqiLabelToCategory(b.name);
    m.set(k, (m.get(k) ?? 0) + b.count);
  }
  return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
}

export function PM25LineChart({
  data,
  pmHourly,
}: {
  data: AQIRecord[];
  pmHourly?: PmHourlyPoint[] | null;
}) {
  const [mode, setMode] = useState<"daily" | "hourly">("hourly");

  const series = useMemo(() => {
    if (pmHourly && pmHourly.length > 0) {
      if (mode === "hourly") {
        return [...pmHourly]
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((p) => ({
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
        .map(([d, v]) => ({ tlabel: d.slice(5), pm25: +(v.sum / v.n).toFixed(1) }));
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
      .map(([d, v]) => ({ tlabel: d.slice(5), pm25: +(v.sum / v.n).toFixed(1) }));
  }, [data, pmHourly, mode]);

  const showToggle = Boolean(pmHourly && pmHourly.length > 0);
  const subtitle = showToggle
    ? mode === "daily"
      ? "Daily mean PM2.5 from the hourly series"
      : "Each point is an hourly sample from the stream"
    : "Daily/Hourly reading over the selected period";

  return (
    <Panel
      title="PM2.5 Trend"
      subtitle={subtitle}
      titleRight={
        showToggle ? (
          <div className="flex gap-1.5 sm:shrink-0">
            <Button
              type="button"
              size="sm"
              className="h-8"
              variant={mode === "daily" ? "default" : "outline"}
              onClick={() => setMode("daily")}
            >
              Daily
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8"
              variant={mode === "hourly" ? "default" : "outline"}
              onClick={() => setMode("hourly")}
            >
              Hourly
            </Button>
          </div>
        ) : undefined
      }
    >
      {series.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data for the trend yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="tlabel"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              interval={showToggle && mode === "hourly" ? "preserveStartEnd" : 0}
            />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="pm25" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

const COMPARISON_LINE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"] as const;

export function PM25ComparisonChart({ sites }: { sites: ComparisonSiteInput[] }) {
  const [mode, setMode] = useState<"daily" | "hourly">("hourly");

  const { rows, canToggleHourly } = useMemo(() => mergeComparisonRows(sites, mode), [sites, mode]);

  const dataKeys = sites.map((s) => s.dataKey);
  const subtitle = canToggleHourly
    ? mode === "daily"
      ? "Daily mean PM2.5 (aligned where timestamps match)"
      : "Hourly samples; sites without an hourly series use daily means"
    : "Daily average from readings per site";

  return (
    <Panel
      title="PM2.5 comparison"
      subtitle={subtitle}
      titleRight={
        canToggleHourly ? (
          <div className="flex gap-1.5 sm:shrink-0">
            <Button
              type="button"
              size="sm"
              className="h-8"
              variant={mode === "daily" ? "default" : "outline"}
              onClick={() => setMode("daily")}
            >
              Daily
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8"
              variant={mode === "hourly" ? "default" : "outline"}
              onClick={() => setMode("hourly")}
            >
              Hourly
            </Button>
          </div>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No PM2.5 data to compare yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="tlabel"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              interval={canToggleHourly && mode === "hourly" ? "preserveStartEnd" : 0}
            />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {dataKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={sites[i]?.displayName ?? key}
                stroke={COMPARISON_LINE_COLORS[i % COMPARISON_LINE_COLORS.length]}
                strokeWidth={2.2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

export function CategoryPie({
  data,
  distributionFromApi,
}: {
  data: AQIRecord[];
  distributionFromApi?: AqiCategoryBucket[] | null;
}) {
  const series = useMemo(() => {
    if (distributionFromApi && distributionFromApi.length > 0) {
      return mergeAqiDistribution(distributionFromApi);
    }
    const counts = new Map<AQICategory, number>();
    data.forEach((r) => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [data, distributionFromApi]);

  if (series.length === 0) {
    return (
      <Panel title="AQI Category Distribution" subtitle="Category distribution count">
        <p className="text-sm text-muted-foreground">No category data yet.</p>
      </Panel>
    );
  }

  return (
    <Panel title="AQI Category Distribution" subtitle="Category distribution count">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={series} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
            {series.map((s) => (
              <Cell key={s.name} fill={AQI_COLORS[s.name as AQICategory].hex} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function HourlyPM25Chart({
  data,
  hourAggregate,
}: {
  data: AQIRecord[];
  hourAggregate?: PmHourAggregatePoint[] | null;
}) {
  const series = useMemo(() => {
    if (hourAggregate && hourAggregate.length > 0) {
      return hourAggregate.map((h) => ({
        hour: h.hour,
        pm25: h.pm25,
      }));
    }
    const byHour = new Map<number, { sum: number; n: number }>();
    for (let h = 0; h < 24; h++) byHour.set(h, { sum: 0, n: 0 });
    data.forEach((r) => {
      const h = new Date(r.time).getHours();
      const cur = byHour.get(h)!;
      cur.sum += r.pm25;
      cur.n += 1;
    });
    return Array.from({ length: 24 }, (_, h) => {
      const v = byHour.get(h)!;
      const avg = v.n ? v.sum / v.n : 0;
      return { hour: `${h.toString().padStart(2, "0")}:00`, h, pm25: +avg.toFixed(1) };
    });
  }, [data, hourAggregate]);

  const fromApi = Boolean(hourAggregate && hourAggregate.length > 0);
  return (
    <Panel
      title="Hourly PM2.5 Data"
      subtitle={fromApi ? "Diurnal mean PM2.5 from the insight stream" : "Average concentration by local hour of day"}
    >
      {series.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hourly data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="hour"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              interval={2}
            />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`${value} µg/m³`, "Avg PM2.5"]}
            />
            <Bar dataKey="pm25" radius={[4, 4, 0, 0]} fill="var(--chart-1)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}
