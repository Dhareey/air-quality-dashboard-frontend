"use client";

import { useEffect, useState } from "react";
import {
  type DashboardCardsResponse,
  fetchDashboardCards,
} from "@/lib/dashboardCards";

export function useDashboardCards(siteId: string): {
  data: DashboardCardsResponse | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<DashboardCardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        const d = await fetchDashboardCards(siteId);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard cards");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  return { data, loading, error };
}
