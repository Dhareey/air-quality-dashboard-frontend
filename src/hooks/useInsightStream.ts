"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_SNAPSHOT,
  getCachedInsightSnapshot,
  subscribeInsight,
  type InsightSnapshot,
} from "@/lib/insightStreamStore";

export function useInsightStream(
  siteId: string,
  startDate: string,
  endDate: string
): InsightSnapshot {
  const [snapshot, setSnapshot] = useState<InsightSnapshot>(() =>
    getCachedInsightSnapshot(siteId, startDate, endDate)
  );

  useEffect(() => {
    if (!siteId) {
      setSnapshot(EMPTY_SNAPSHOT);
      return;
    }
    setSnapshot(getCachedInsightSnapshot(siteId, startDate, endDate));
    return subscribeInsight(siteId, startDate, endDate, setSnapshot);
  }, [siteId, startDate, endDate]);

  return snapshot;
}
