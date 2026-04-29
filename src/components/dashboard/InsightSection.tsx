import { Sparkles } from "lucide-react";
import type { AQIRecord } from "@/lib/aqi";
import type { LlmSummaryPayload } from "@/lib/insightStream";

const INSIGHT_BULLETS_MAX = 5;

function buildInsights(data: AQIRecord[]) {
  if (!data.length) return ["No data available for the current filter selection."];

  const byCountry: Record<string, number[]> = {};
  data.forEach((r) => {
    (byCountry[r.country] ??= []).push(r.pm25);
  });
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const cityAvg = new Map<string, number>();
  const cityN = new Map<string, number>();
  data.forEach((r) => {
    cityAvg.set(r.city, (cityAvg.get(r.city) ?? 0) + r.pm25);
    cityN.set(r.city, (cityN.get(r.city) ?? 0) + 1);
  });
  const cityRanked = Array.from(cityAvg.entries())
    .map(([city, sum]) => ({ city, avg: sum / (cityN.get(city) ?? 1) }))
    .sort((a, b) => b.avg - a.avg);

  const top = cityRanked[0];
  const bottom = cityRanked[cityRanked.length - 1];
  const spikes = data.filter((r) => r.pm25 > 75).length;
  const spikePct = ((spikes / data.length) * 100).toFixed(1);

  const lines: string[] = [];
  const countryKeys = Object.keys(byCountry);
  if (countryKeys.length >= 2) {
    const c0 = byCountry[countryKeys[0]!]!;
    const c1 = byCountry[countryKeys[1]!]!;
    const a0 = avg(c0);
    const a1 = avg(c1);
    const pct = a1 !== 0 ? (((a0 - a1) / a1) * 100).toFixed(0) : "0";
    lines.push(
      `${countryKeys[0]} mean PM2.5: ${a0.toFixed(1)} µg/m³ vs ${countryKeys[1]}: ${a1.toFixed(1)} µg/m³ (${pct}% difference).`
    );
  }
  if (top && bottom) {
    lines.push(
      `${top.city} shows the highest pollution burden with an average of ${top.avg.toFixed(1)} µg/m³, while ${bottom.city} reports the cleanest air at ${bottom.avg.toFixed(1)} µg/m³.`
    );
  }
  lines.push(
    `${spikes.toLocaleString()} readings (${spikePct}%) exceeded the 75 µg/m³ threshold, suggesting episodic pollution or peak exposure windows.`
  );
  if (top) {
    lines.push(
      `Consider prioritising alerts in ${top.city} and reviewing sources affecting ${cityRanked.slice(0, 3).map((c) => c.city).join(", ")}.`
    );
  }
  return lines;
}

export function InsightSection({
  data,
  llmFromStream,
  streamDone,
  streamError,
}: {
  data: AQIRecord[];
  /** Set after `llm_summary` event (use null before the event) */
  llmFromStream: LlmSummaryPayload | null;
  streamDone: boolean;
  streamError: string | null;
}) {
  if (streamError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Insights unavailable: {streamError}
      </div>
    );
  }

  if (!streamDone) {
    return (
      <div className="rounded-xl border border-border bg-gradient-to-br from-card to-accent/40 p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">AI-Generated Insights</h3>
        </div>
        <p className="text-sm text-muted-foreground">Waiting for the insight stream (LLM summary)…</p>
      </div>
    );
  }

  if (llmFromStream) {
    const { bullets, error: llmErr } = llmFromStream;
    const shownBullets = bullets.slice(0, INSIGHT_BULLETS_MAX);
    return (
      <div className="rounded-xl border border-border bg-gradient-to-br from-card to-accent/40 p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI-Generated Insights</h3>
            <p className="text-xs text-muted-foreground">Narrative from the insight stream (llm_summary)</p>
          </div>
        </div>
        {llmErr && <p className="mb-3 text-sm text-destructive">LLM: {llmErr}</p>}
        {bullets.length === 0 && !llmErr ? (
          <p className="text-sm text-muted-foreground">No LLM bullets were returned.</p>
        ) : (
          <ul className="list-outside list-disc space-y-2.5 pl-4 text-sm leading-relaxed text-foreground/90 marker:text-muted-foreground">
            {shownBullets.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const insights = buildInsights(data).slice(0, INSIGHT_BULLETS_MAX);
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card to-accent/40 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI-Generated Insights</h3>
          <p className="text-xs text-muted-foreground">Heuristic summary from loaded readings (no LLM event in stream)</p>
        </div>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
        {insights.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
