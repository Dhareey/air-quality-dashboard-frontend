import { useMemo } from "react";
import { MOCK_DATA, type AQIRecord } from "./aqi";
import type { FiltersState } from "@/components/dashboard/FilterPanel";
import type { MergedFilterConfig } from "./filterConfig";

export function useFilteredData(
  filters: FiltersState,
  _config: MergedFilterConfig | null
): { data: AQIRecord[] } {
  const data = useMemo(() => {
    if (filters.sites.length === 0) {
      return [];
    }
    const startMs = new Date(filters.startDate).getTime();
    const endMs = new Date(filters.endDate).getTime() + 86400000;
    return MOCK_DATA.filter((r) => {
      if (filters.country !== "Both" && r.country !== filters.country) return false;
      if (!filters.sites.includes(r.siteId)) return false;
      const t = new Date(r.time).getTime();
      if (t < startMs || t > endMs) return false;
      return true;
    });
  }, [filters]);
  return { data };
}
