"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FilterPanel, getDefaultFilters, type FiltersState } from "@/components/dashboard/FilterPanel";
import { AgentChat } from "@/components/agent/AgentChat";
import { useFilterConfig } from "@/hooks/useFilterConfig";

export function AgentPage() {
  const [filters, setFilters] = useState<FiltersState>(() => getDefaultFilters());
  const { config, loading, error } = useFilterConfig();
  const [chatCollapsed, setChatCollapsed] = useState(false);

  return (
    <AppShell>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Air Quality Agent</h1>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      </header>

      <div className="flex min-w-0 flex-1">
        <AgentChat collapsed={chatCollapsed} onToggle={() => setChatCollapsed((c) => !c)} />
        <FilterPanel
          value={filters}
          onChange={setFilters}
          onApply={() => {}}
          onReset={() => setFilters(getDefaultFilters())}
          config={config}
          configLoading={loading}
          configError={error}
        />
        <main className="min-w-0 flex-1 p-6">
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-foreground">Coming soon</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              The interactive agent experience is under development. Check back later.
            </p>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
