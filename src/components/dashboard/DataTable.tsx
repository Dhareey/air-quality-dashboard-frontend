"use client";

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { AQI_COLORS, type AQIRecord } from "@/lib/aqi";
import { Button } from "@/components/ui/button";

type SortKey = "time" | "country" | "city" | "pm25" | "category";

export function DataTable({ data }: { data: AQIRecord[] }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "time", dir: "desc" });
  const pageSize = 10;

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const av = a[sort.key]; const bv = b[sort.key];
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, totalPages);
  const slice = sorted.slice((cur - 1) * pageSize, cur * pageSize);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key !== k ? <ChevronsUpDown className="h-3 w-3 opacity-50" />
      : sort.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;

  const head = (label: string, key?: SortKey) => (
    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
      {key ? (
        <button onClick={() => toggle(key)} className="inline-flex items-center gap-1 hover:text-foreground">
          {label} <SortIcon k={key} />
        </button>
      ) : label}
    </th>
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Readings</h3>
        <p className="text-xs text-muted-foreground">{sorted.length.toLocaleString()} rows</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {head("Time", "time")}
              {head("Country", "country")}
              {head("City", "city")}
              {head("Site ID")}
              {head("Device ID")}
              {head("PM2.5", "pm25")}
              {head("AQI Category", "category")}
              {head("Color")}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
              const c = AQI_COLORS[r.category];
              return (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-foreground">{new Date(r.time).toISOString().replace("T", " ").slice(0, 16)}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.country}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.city}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.siteId}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.deviceId}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{r.pm25.toFixed(1)}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `color-mix(in oklab, ${c.hex} 18%, transparent)`, color: c.hex }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.hex }} />
                      {r.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.label}</td>
                </tr>
              );
            })}
            {slice.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No records match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">Page {cur} of {totalPages}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={cur >= totalPages} onClick={() => setPage(cur + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
