"use client";

import { useEffect, useState } from "react";
import {
  type MergedFilterConfig,
  mergeFilterConfigResponse,
  fetchFilterConfig,
} from "@/lib/filterConfig";

export function useFilterConfig(): {
  config: MergedFilterConfig | null;
  loading: boolean;
  error: string | null;
} {
  const [config, setConfig] = useState<MergedFilterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const c = await fetchFilterConfig();
        if (!cancelled) setConfig(c);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load filter options");
          setConfig(mergeFilterConfigResponse([]));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading, error };
}
