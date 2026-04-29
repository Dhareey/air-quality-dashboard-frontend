"use client";

import { useMemo } from "react";
import { FileBarChart } from "lucide-react";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { useDashboardCards } from "@/hooks/useDashboardCards";
import { PM25LineChart, CategoryPie, HourlyPM25Chart } from "@/components/dashboard/Charts";
import { DataTable } from "@/components/dashboard/DataTable";
import { InsightSection } from "@/components/dashboard/InsightSection";
import { cn } from "@/lib/utils";
import { useInsightStream } from "@/hooks/useInsightStream";
import { mapStreamReadingsToAqiRecords } from "@/lib/readingsToAqi";

export function SelectSitesReportPrompt() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <FileBarChart className="h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">Select sites to generate report</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Choose up to three sites in the filter panel, then apply. A separate report appears for each site in
        the order you selected. Each report opens a live connection to the insight stream for that site.
      </p>
    </div>
  );
}

type LayoutBp = "xl" | "2xl";

function reportGridClass(bp: LayoutBp) {
  return cn("grid grid-cols-1 gap-6", bp === "2xl" ? "2xl:grid-cols-3" : "xl:grid-cols-3");
}

function wideColClass(bp: LayoutBp) {
  return bp === "2xl" ? "2xl:col-span-2" : "xl:col-span-2";
}

export function SiteReportBlock({
  siteId,
  siteName,
  startDate,
  endDate,
  layoutBreakpoint = "xl",
}: {
  siteId: string;
  siteName: string;
  startDate: string;
  endDate: string;
  layoutBreakpoint?: LayoutBp;
}) {
  const bp = layoutBreakpoint;
  const dashboardCards = useDashboardCards(siteId);
  const insight = useInsightStream(siteId, startDate, endDate);

  const tableData = useMemo(
    () => mapStreamReadingsToAqiRecords(insight.readings),
    [insight.readings]
  );

  return (
    <section className="space-y-6 border-b border-border pb-10 last:mb-0 last:border-0 last:pb-0">
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h2 className="min-w-0 text-lg font-semibold tracking-tight text-foreground sm:shrink sm:pr-2">
            Report for {siteName}
          </h2>
          <div className="min-w-0 sm:max-w-[60%] sm:shrink-0 sm:text-right">
            {dashboardCards.loading && (
              <p className="text-sm text-muted-foreground sm:leading-snug">Loading site details from dashboard…</p>
            )}
            {dashboardCards.error && !dashboardCards.loading && (
              <p className="text-sm text-destructive/90 sm:leading-snug">
                Could not load site details: {dashboardCards.error}
              </p>
            )}
            {dashboardCards.data && !dashboardCards.loading && (
              <p className="text-sm leading-snug text-muted-foreground">
                {dashboardCards.data.city}, {dashboardCards.data.country}
                {dashboardCards.data.time
                  ? ` · ${new Date(dashboardCards.data.time).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}`
                  : ""}
              </p>
            )}
          </div>
        </div>
        {!insight.done && !insight.error && (
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-1">Streaming insight data…</p>
        )}
      </div>

      <KpiCards cards={dashboardCards} totalRecordCount={insight.totalRecords} />

      <div className="w-full min-w-0">
        <PM25LineChart data={tableData} pmHourly={insight.pmHourly} />
      </div>
      <div className={reportGridClass(bp)}>
        <div className={wideColClass(bp)}>
          <HourlyPM25Chart data={tableData} hourAggregate={insight.pmHourAggregate} />
        </div>
        <CategoryPie data={tableData} distributionFromApi={insight.aqiDistribution} />
      </div>
      <InsightSection
        data={tableData}
        llmFromStream={insight.llmSummary}
        streamDone={insight.done}
        streamError={insight.error}
      />
      <DataTable data={tableData} />
    </section>
  );
}
