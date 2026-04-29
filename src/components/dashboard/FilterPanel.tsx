"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MOCK_REFERENCE_DATE } from "@/lib/aqi";
import {
  type MergedFilterConfig,
  listRegionOptions,
  collectSitesInScope,
} from "@/lib/filterConfig";

export interface FiltersState {
  country: "Nigeria" | "Ghana" | "Both";
  startDate: string;
  endDate: string;
  /** "all" or value from `makeRegionValue` */
  region: string;
  /** Up to 3 `site_id`s from filter_config; empty shows no report until sites are selected */
  sites: string[];
}

const REF_MS = MOCK_REFERENCE_DATE.getTime();

export const DEFAULT_FILTERS: FiltersState = {
  country: "Both",
  startDate: new Date(REF_MS - 30 * 86400000).toISOString().slice(0, 10),
  endDate: new Date(REF_MS).toISOString().slice(0, 10),
  region: "all",
  sites: [],
};

interface Props {
  value: FiltersState;
  onChange: (v: FiltersState) => void;
  onApply: () => void;
  onReset: () => void;
  config: MergedFilterConfig | null;
  configLoading: boolean;
  configError: string | null;
}

export function FilterPanel({
  value,
  onChange,
  onApply,
  onReset,
  config,
  configLoading,
  configError,
}: Props) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState(value);
  /** Remounts the site Select after each add so the trigger shows the placeholder again */
  const [siteAddKey, setSiteAddKey] = useState(0);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const set = <K extends keyof FiltersState>(k: K, v: FiltersState[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const regionOptions = useMemo(() => {
    if (!config) return [];
    return listRegionOptions(config, draft.country);
  }, [config, draft.country]);

  const siteOptions = useMemo(() => {
    if (!config) return [];
    return collectSitesInScope(config, draft.country, draft.region).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [config, draft.country, draft.region]);

  const addableSites = useMemo(
    () => siteOptions.filter((s) => !draft.sites.includes(s.site_id)),
    [siteOptions, draft.sites]
  );
  const atSiteCap = draft.sites.length >= 3;

  useEffect(() => {
    if (siteOptions.length === 0) return;
    const valid = new Set(siteOptions.map((s) => s.site_id));
    setDraft((d) => {
      const next = d.sites.filter((id) => valid.has(id));
      if (next.length === d.sites.length) return d;
      return { ...d, sites: next };
    });
  }, [siteOptions]);

  return (
    <div
      className={cn(
        "sticky top-16 h-[calc(100vh-4rem)] shrink-0 border-r border-border bg-card transition-[width] duration-300",
        open ? "w-[300px]" : "w-[52px]"
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        {open && (
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-primary" />
            Filters
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Toggle filters"
        >
          {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="flex h-[calc(100%-3rem)] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {configLoading && (
              <p className="text-xs text-muted-foreground">Loading locations from API…</p>
            )}
            {configError && (
              <p className="text-xs text-destructive" title={configError}>
                Filter list unavailable. Check the API and CORS ({configError})
              </p>
            )}

            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={draft.country}
                onValueChange={(v) => {
                  setDraft((d) => ({
                    ...d,
                    country: v as FiltersState["country"],
                    region: "all",
                    sites: [],
                  }));
                }}
                disabled={configLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Both">Both</SelectItem>
                  <SelectItem value="Nigeria">Nigeria</SelectItem>
                  <SelectItem value="Ghana">Ghana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={draft.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={draft.region}
                onValueChange={(v) => setDraft((d) => ({ ...d, region: v, sites: [] }))}
                disabled={configLoading || !config}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {regionOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Sites</Label>
                <span className="text-[11px] tabular-nums text-muted-foreground">{draft.sites.length}/3</span>
              </div>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Select at least one site, then Apply, to load reports (up to 3).
              </p>
              <Select
                key={siteAddKey}
                disabled={
                  atSiteCap ||
                  configLoading ||
                  !config ||
                  addableSites.length === 0
                }
                onValueChange={(id) => {
                  setDraft((d) => {
                    if (d.sites.includes(id) || d.sites.length >= 3) return d;
                    return { ...d, sites: [...d.sites, id] };
                  });
                  setSiteAddKey((k) => k + 1);
                }}
              >
                <SelectTrigger
                  className="h-8 w-full text-xs"
                  title={atSiteCap ? "Remove a site to add another" : undefined}
                >
                  <SelectValue placeholder="Add site" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {addableSites.map((s) => (
                    <SelectItem
                      key={s.site_id}
                      value={s.site_id}
                      title={s.name}
                      className="py-1.5 text-xs"
                    >
                      <span className="line-clamp-2 text-left leading-tight">{s.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {atSiteCap && siteOptions.length > 0 && (
                <p className="text-[11px] leading-tight text-muted-foreground">Max 3 — remove one to add.</p>
              )}
              {!atSiteCap && addableSites.length === 0 && siteOptions.length > 0 && (
                <p className="text-[11px] leading-tight text-muted-foreground">All in scope selected.</p>
              )}

              {draft.sites.length > 0 && (
                <ul className="space-y-1 pt-0.5" aria-label="Selected sites">
                  {draft.sites.map((siteId) => {
                    const meta = siteOptions.find((s) => s.site_id === siteId);
                    return (
                      <li
                        key={siteId}
                        className="flex items-start gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-1 text-[11px] leading-tight"
                      >
                        <span className="min-w-0 flex-1 leading-snug text-foreground" title={meta?.name}>
                          {meta?.name ?? siteId}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              sites: d.sites.filter((x) => x !== siteId),
                            }))
                          }
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Remove ${meta?.name ?? siteId}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex gap-2 border-t border-border p-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setDraft(DEFAULT_FILTERS);
                onChange(DEFAULT_FILTERS);
                onReset();
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                onChange(draft);
                onApply();
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
