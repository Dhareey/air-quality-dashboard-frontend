"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FilterPanel, DEFAULT_FILTERS, type FiltersState } from "@/components/dashboard/FilterPanel";
import { SelectSitesReportPrompt, SiteReportBlock } from "@/components/dashboard/SiteReportPanel";
import { ComparisonSection } from "@/components/dashboard/ComparisonSection";
import { AgentChat } from "@/components/agent/AgentChat";
import { useFilterConfig } from "@/hooks/useFilterConfig";
import { getSiteDisplayName } from "@/lib/filterConfig";

export function AgentPage() {
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const { config, loading, error } = useFilterConfig();
  const [chatCollapsed, setChatCollapsed] = useState(false);

  return (
    <AppShell>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Air Quality Agent</h1>
          <p className="text-sm text-muted-foreground">Ask questions, refine filters, and explore the data interactively</p>
        </div>
      </header>

      <div className="flex min-w-0 flex-1">
        <AgentChat collapsed={chatCollapsed} onToggle={() => setChatCollapsed((c) => !c)} />
        <FilterPanel
          value={filters}
          onChange={setFilters}
          onApply={() => {}}
          onReset={() => setFilters(DEFAULT_FILTERS)}
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
                  layoutBreakpoint="2xl"
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
