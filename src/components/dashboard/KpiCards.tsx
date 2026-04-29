"use client";

import type { ReactNode } from "react";
import { Database, Activity, Tag, Palette, Type, Cpu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { normalizeAqiColorHex, type DashboardCardsResponse } from "@/lib/dashboardCards";
import { cn } from "@/lib/utils";

function Card({
  label,
  value,
  hint,
  Icon,
  tone,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  Icon: LucideIcon;
  tone: "primary" | "good" | "unhealthy" | "muted" | "info";
  /** Override value typography (e.g. long IDs) */
  valueClassName?: string;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    good: "bg-[var(--aqi-good)]/15 text-[var(--aqi-good)]",
    unhealthy: "bg-[var(--aqi-unhealthy)]/15 text-[var(--aqi-unhealthy)]",
    muted: "bg-muted text-muted-foreground",
    info: "bg-sky-500/10 text-sky-600",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <div
            className={cn(
              "mt-2 break-words text-base font-semibold tracking-tight text-foreground sm:text-lg",
              valueClassName
            )}
          >
            {value}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function dash() {
  return <span className="text-muted-foreground">—</span>;
}

export type DashboardCardsState = {
  data: DashboardCardsResponse | null;
  loading: boolean;
  error: string | null;
};

export function KpiCards({
  totalRecordCount,
  cards,
}: {
  /** From `useDashboardCards` in the parent (single fetch for header + KPIs) */
  cards: DashboardCardsState;
  /** When set, replaces the "Total records" placeholder (from `total_records` SSE) */
  totalRecordCount?: number | null;
}) {
  const { data, loading, error } = cards;
  const hex = data ? normalizeAqiColorHex(data.aqi_color) : null;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Could not load dashboard cards: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[7.5rem] animate-pulse rounded-xl border border-border bg-muted/40 p-5"
          />
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        label="PM2.5"
        value={`${data.pm2_5_value.toFixed(2)} µg/m³`}
        hint={`Time: ${data.time ? new Date(data.time).toLocaleString() : "—"}`}
        Icon={Activity}
        tone="muted"
      />
      <Card
        label="PM10"
        value={Number.isFinite(data.pm_10) ? `${data.pm_10.toFixed(2)} µg/m³` : dash()}
        hint="From dashboard-cards API"
        Icon={Activity}
        tone="info"
      />
      <Card
        label="AQI category"
        value={data.aqi_category}
        hint="From API"
        Icon={Type}
        tone="good"
      />
      <Card
        label="site_id"
        value={data.site_id}
        hint="From API"
        Icon={Tag}
        tone="muted"
        valueClassName="text-xs font-mono font-normal sm:text-sm break-all [overflow-wrap:anywhere]"
      />
      <Card
        label="aqi_color"
        value={
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: hex! }} />
            <span className="font-mono text-sm">{data.aqi_color}</span>
          </span>
        }
        hint="Raw hex from API"
        Icon={Palette}
        tone="info"
      />
      <Card
        label="aqi_color_name"
        value={data.aqi_color_name}
        hint="From API"
        Icon={Palette}
        tone="muted"
      />
      <Card
        label="Total records"
        value={
          totalRecordCount != null && Number.isFinite(totalRecordCount)
            ? totalRecordCount.toLocaleString()
            : dash()
        }
        hint={totalRecordCount != null ? "From generate_insight stream" : "Waiting for total_records event"}
        Icon={Database}
        tone="primary"
      />
      <Card
        label="device_id"
        value={data.device_id}
        hint="From API"
        Icon={Cpu}
        tone="muted"
        valueClassName="text-xs font-mono font-normal sm:text-sm break-all [overflow-wrap:anywhere]"
      />
    </div>
  );
}
