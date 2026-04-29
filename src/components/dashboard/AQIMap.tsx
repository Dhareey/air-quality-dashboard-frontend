"use client";

import { useMemo } from "react";
import { AQI_COLORS, type AQIRecord } from "@/lib/aqi";

// Lightweight SVG map of West Africa region (approximate outlines for Nigeria & Ghana area).
// Uses an equirectangular projection for the longitude/latitude window we care about.
const LON_MIN = -4, LON_MAX = 16;
const LAT_MIN = 3.5, LAT_MAX = 14;
const W = 800, H = 460;

function project(lng: number, lat: number) {
  const x = ((lng - LON_MIN) / (LON_MAX - LON_MIN)) * W;
  const y = H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H;
  return { x, y };
}

export function AQIMap({ data }: { data: AQIRecord[] }) {
  // Aggregate by lat/lng cluster (by city) for cleaner display
  const points = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; sum: number; n: number; city: string; country: string }>();
    data.forEach((r) => {
      const key = `${r.city}`;
      const cur = map.get(key) ?? { lat: r.lat, lng: r.lng, sum: 0, n: 0, city: r.city, country: r.country };
      cur.sum += r.pm25; cur.n += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).map((v) => {
      const avg = v.sum / v.n;
      const cat = avg <= 12 ? "Good" : avg <= 35 ? "Moderate" : avg <= 55 ? "Unhealthy for Sensitive" : avg <= 150 ? "Unhealthy" : avg <= 250 ? "Very Unhealthy" : "Hazardous";
      return { ...v, avg, cat: cat as keyof typeof AQI_COLORS };
    });
  }, [data]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Geographic Distribution</h3>
          <p className="text-xs text-muted-foreground">Site-level average PM2.5, color-coded by AQI category</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["Good", "Moderate", "Unhealthy for Sensitive", "Unhealthy", "Very Unhealthy"] as const).map((c) => (
            <span key={c} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: AQI_COLORS[c].hex }} />{c}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg bg-[oklch(0.97_0.02_220)] ring-1 ring-border">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[460px] w-full">
          {/* graticule */}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`v${i}`} x1={(i / 5) * W} x2={(i / 5) * W} y1={0} y2={H} stroke="var(--border)" strokeWidth={0.5} />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h${i}`} x1={0} x2={W} y1={(i / 4) * H} y2={(i / 4) * H} stroke="var(--border)" strokeWidth={0.5} />
          ))}

          {/* Approximate Nigeria outline */}
          <path
            d="M 480 110 L 600 130 L 660 200 L 640 280 L 600 340 L 520 360 L 460 340 L 420 290 L 410 220 Z"
            fill="oklch(0.94 0.02 200)" stroke="oklch(0.7 0.03 220)" strokeWidth={1}
          />
          <text x={520} y={240} fontSize="14" fill="var(--muted-foreground)" fontWeight={600} opacity={0.6}>Nigeria</text>

          {/* Approximate Ghana outline */}
          <path
            d="M 220 230 L 270 220 L 290 270 L 290 330 L 260 360 L 220 360 L 200 320 L 200 270 Z"
            fill="oklch(0.94 0.02 200)" stroke="oklch(0.7 0.03 220)" strokeWidth={1}
          />
          <text x={222} y={300} fontSize="13" fill="var(--muted-foreground)" fontWeight={600} opacity={0.6}>Ghana</text>

          {/* points */}
          {points.map((p) => {
            const { x, y } = project(p.lng, p.lat);
            const color = AQI_COLORS[p.cat].hex;
            const r = 6 + Math.min(14, p.avg / 6);
            return (
              <g key={p.city}>
                <circle cx={x} cy={y} r={r} fill={color} fillOpacity={0.25} />
                <circle cx={x} cy={y} r={5} fill={color} stroke="white" strokeWidth={1.5} />
                <text x={x + 9} y={y + 4} fontSize="11" fill="var(--foreground)" fontWeight={500}>
                  {p.city} <tspan fill="var(--muted-foreground)">{p.avg.toFixed(0)}</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
