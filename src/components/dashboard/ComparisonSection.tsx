"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { PM25ComparisonChart } from "@/components/dashboard/Charts";
import { useInsightStream } from "@/hooks/useInsightStream";
import { buildDailyPmForCompare, type ComparisonSiteInput } from "@/lib/comparisonPm25";
import { postCompareSites, type CompareSitesRequestBody } from "@/lib/compareSites";
import { mapStreamReadingsToAqiRecords } from "@/lib/readingsToAqi";
import { cn } from "@/lib/utils";

function formatComparisonTitle(names: string[]) {
  if (names.length === 2) return `Comparison between ${names[0]} and ${names[1]}`;
  if (names.length === 3) {
    return `Comparison between ${names[0]}, ${names[1]}, and ${names[2]}`;
  }
  if (names.length < 2) return "Comparison";
  return `Comparison between ${names.join(", ")}`;
}

/**
 * Renders when two or three sites are selected. Opens additional insight streams
 * (one per site) in parallel with the per-site report — a future optimization
 * is to share stream data with the parent to avoid duplicate connections.
 */
export function ComparisonSection({
  siteIds,
  siteNames,
  startDate,
  endDate,
}: {
  siteIds: string[];
  siteNames: string[];
  startDate: string;
  endDate: string;
}) {
  const n = siteIds.length;
  if (n < 2) return null;

  const id0 = siteIds[0] ?? "";
  const id1 = siteIds[1] ?? "";
  const id2 = siteIds[2] ?? "";

  const s0 = useInsightStream(id0, startDate, endDate);
  const s1 = useInsightStream(id1, startDate, endDate);
  const s2 = useInsightStream(id2, startDate, endDate);

  const streams = n === 3 ? [s0, s1, s2] : [s0, s1];
  const comparisonSites: ComparisonSiteInput[] = streams.map((st, i) => ({
    dataKey: `s${i}`,
    displayName: siteNames[i] ?? siteIds[i] ?? `Site ${i + 1}`,
    pmHourly: st.pmHourly,
    aqi: mapStreamReadingsToAqiRecords(st.readings),
  }));
  const hasAnyError = streams.some((s) => s.error);
  const allComplete = streams.every((s) => s.done);
  const names = siteNames.slice(0, n);

  const [compareBullets, setCompareBullets] = useState<string[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const siteNamesKey = JSON.stringify(names);

  useEffect(() => {
    if (!allComplete || hasAnyError) {
      if (!allComplete) {
        setCompareLoading(false);
        setCompareError(null);
        setCompareBullets([]);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      setCompareLoading(true);
      setCompareError(null);
      try {
        const nameList = JSON.parse(siteNamesKey) as string[];
        if (!Array.isArray(nameList) || nameList.length < 2) return;
        const a0 = mapStreamReadingsToAqiRecords(s0.readings);
        const a1 = mapStreamReadingsToAqiRecords(s1.readings);
        const d0 = buildDailyPmForCompare({ pmHourly: s0.pmHourly, aqi: a0 });
        const d1 = buildDailyPmForCompare({ pmHourly: s1.pmHourly, aqi: a1 });
        const body: CompareSitesRequestBody = {
          first_site: { site_name: nameList[0] ?? "", daily_pm: d0 },
          second_site: { site_name: nameList[1] ?? "", daily_pm: d1 },
        };
        if (n === 3) {
          const a2 = mapStreamReadingsToAqiRecords(s2.readings);
          body.third_site = {
            site_name: nameList[2] ?? "",
            daily_pm: buildDailyPmForCompare({ pmHourly: s2.pmHourly, aqi: a2 }),
          };
        }
        const out = await postCompareSites(body);
        if (!cancelled) {
          setCompareBullets(out);
          setCompareError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setCompareError(e instanceof Error ? e.message : "compare_sites request failed");
          setCompareBullets([]);
        }
      } finally {
        if (!cancelled) setCompareLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // s0/s1/s2: intentionally omitted from deps to avoid re-fetch every render; they match the run when allComplete / selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allComplete, hasAnyError, n, startDate, endDate, id0, id1, id2, siteNamesKey]);

  return (
    <section className="space-y-6 border-t border-border pt-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{formatComparisonTitle(names)}</h2>
        {hasAnyError && (
          <p className="mt-1 text-sm text-destructive/90">
            One or more comparison streams had an error. Charts may be incomplete; check the per-site report above.
          </p>
        )}
        {!allComplete && !hasAnyError && (
          <p className="mt-1 text-sm text-muted-foreground">Loading comparison data from insight streams…</p>
        )}
      </div>

      <div className="w-full min-w-0">
        <PM25ComparisonChart sites={comparisonSites} />
      </div>

      <ComparisonSummaryCard
        allStreamsDone={allComplete}
        streamError={hasAnyError}
        loading={compareLoading}
        error={compareError}
        bullets={compareBullets}
      />
    </section>
  );
}

function ComparisonSummaryCard({
  allStreamsDone,
  streamError,
  loading,
  error,
  bullets,
}: {
  allStreamsDone: boolean;
  streamError: boolean;
  loading: boolean;
  error: string | null;
  bullets: string[];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 p-6",
        "shadow-sm"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI comparison summary</h3>
          <p className="text-xs text-muted-foreground">From POST /compare_sites (daily PM2.5 means)</p>
        </div>
      </div>
      {streamError && (
        <p className="text-sm text-muted-foreground">
          Comparison summary is skipped because one or more insight streams failed.
        </p>
      )}
      {!allStreamsDone && !streamError && (
        <p className="text-sm text-muted-foreground">Waiting for all insight streams to complete…</p>
      )}
      {allStreamsDone && !streamError && loading && (
        <p className="text-sm text-muted-foreground">Generating comparison summary…</p>
      )}
      {allStreamsDone && !streamError && !loading && error && (
        <p className="text-sm text-destructive/90">Comparison summary failed: {error}</p>
      )}
      {allStreamsDone && !streamError && !loading && !error && bullets.length > 0 && (
        <ul className="list-outside list-disc space-y-2.5 pl-4 text-sm leading-relaxed text-foreground/90 marker:text-muted-foreground">
          {bullets.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      {allStreamsDone && !streamError && !loading && !error && bullets.length === 0 && (
        <p className="text-sm text-muted-foreground">No comparison lines were returned.</p>
      )}
    </div>
  );
}
