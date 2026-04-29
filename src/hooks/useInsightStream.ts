"use client";

import { useEffect, useState, useRef } from "react";
import {
  buildGenerateInsightUrl,
  type PmHourlyPoint,
  type PmHourAggregatePoint,
  type AqiCategoryBucket,
  type StreamReading,
  type LlmSummaryPayload,
} from "@/lib/insightStream";

export function useInsightStream(
  siteId: string,
  startDate: string,
  endDate: string
): {
  totalRecords: number | null;
  pmHourly: PmHourlyPoint[];
  pmHourAggregate: PmHourAggregatePoint[];
  aqiDistribution: AqiCategoryBucket[];
  llmSummary: LlmSummaryPayload | null;
  readings: StreamReading[];
  done: boolean;
  error: string | null;
  open: boolean;
} {
  const [totalRecords, setTotalRecords] = useState<number | null>(null);
  const [pmHourly, setPmHourly] = useState<PmHourlyPoint[]>([]);
  const [pmHourAggregate, setPmHourAggregate] = useState<PmHourAggregatePoint[]>([]);
  const [aqiDistribution, setAqiDistribution] = useState<AqiCategoryBucket[]>([]);
  const [llmSummary, setLlmSummary] = useState<LlmSummaryPayload | null>(null);
  const [readings, setReadings] = useState<StreamReading[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!siteId) return;
    completedRef.current = false;
    setTotalRecords(null);
    setPmHourly([]);
    setPmHourAggregate([]);
    setAqiDistribution([]);
    setLlmSummary(null);
    setReadings([]);
    setDone(false);
    setError(null);

    const url = buildGenerateInsightUrl(siteId, startDate, endDate);
    const es = new EventSource(url);

    const onError = () => {
      if (completedRef.current) return;
      setError("Insight stream error — check the API, CORS, and that the endpoint supports EventSource (SSE).");
      es.close();
    };

    es.addEventListener("error", onError);

    es.addEventListener("total_records", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as { total_records?: number };
        if (typeof j.total_records === "number") setTotalRecords(j.total_records);
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("pm_hourly", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as { pm_hourly?: PmHourlyPoint[] };
        if (Array.isArray(j.pm_hourly)) setPmHourly(j.pm_hourly);
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("pm_hour_aggregate", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as { pm_hour_aggregate?: PmHourAggregatePoint[] };
        if (Array.isArray(j.pm_hour_aggregate)) setPmHourAggregate(j.pm_hour_aggregate);
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("aqi_category_distribution", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as { aqi_category_distribution?: AqiCategoryBucket[] };
        if (Array.isArray(j.aqi_category_distribution)) {
          setAqiDistribution(j.aqi_category_distribution);
        }
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("llm_summary", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as LlmSummaryPayload;
        if (j && "bullets" in j) {
          setLlmSummary({
            bullets: Array.isArray(j.bullets) ? j.bullets : [],
            error: j.error ?? null,
          });
        }
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("readings", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as { readings?: StreamReading[] };
        if (Array.isArray(j.readings)) setReadings(j.readings);
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("complete", () => {
      completedRef.current = true;
      setDone(true);
      es.close();
    });

    return () => {
      es.removeEventListener("error", onError);
      es.close();
    };
  }, [siteId, startDate, endDate]);

  return {
    totalRecords,
    pmHourly,
    pmHourAggregate,
    aqiDistribution,
    llmSummary,
    readings,
    done,
    error,
  };
}
