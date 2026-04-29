"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FilterPanel, getDefaultFilters, type FiltersState } from "@/components/dashboard/FilterPanel";
import { SelectSitesReportPrompt, SiteReportBlock } from "@/components/dashboard/SiteReportPanel";
import { ComparisonSection } from "@/components/dashboard/ComparisonSection";
import { useFilterConfig } from "@/hooks/useFilterConfig";
import { getSiteDisplayName } from "@/lib/filterConfig";

export function DashboardPage() {
  const [filters, setFilters] = useState<FiltersState>(() => getDefaultFilters());
  const { config, loading, error } = useFilterConfig();

  return (
    <AppShell>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Air Quality Dashboard</h1>
          <p className="text-sm text-muted-foreground">PM2.5 monitoring across Nigeria & Ghana</p>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span className="inline-flex h-2 w-2 rounded-full bg-[var(--aqi-good)]" />
          Live mock dataset
        </div>
      </header>

      <div className="flex min-w-0 flex-1">
        <FilterPanel
          value={filters}
          onChange={setFilters}
          onApply={() => {}}
          onReset={() => setFilters(getDefaultFilters())}
          config={config}
          configLoading={loading}
          configError={error}
        />
        <main className="min-w-0 flex-1 space-y-6 p-6">
          {filters.sites.length === 0 ? (
            <SelectSitesReportPrompt />
          ) : (
            <>
              {filters.sites.map((siteId) => (
                <SiteReportBlock
                  key={siteId}
                  siteId={siteId}
                  siteName={getSiteDisplayName(config, siteId) ?? siteId}
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                  layoutBreakpoint="xl"
                />
              ))}
              {filters.sites.length >= 2 && (
                <ComparisonSection
                  siteIds={filters.sites}
                  siteNames={filters.sites.map((id) => getSiteDisplayName(config, id) ?? id)}
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                />
              )}
            </>
          )}
        </main>
      </div>
    </AppShell>
  );
}
