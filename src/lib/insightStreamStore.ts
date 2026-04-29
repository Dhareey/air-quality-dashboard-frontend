"use client";

/**
 * Shared insight-stream store.
 *
 * - At most ONE `EventSource` per `(siteId, startDate, endDate)` key.
 * - Multiple subscribers (e.g. a SiteReportBlock and a ComparisonSection for
 *   the same site) share the same stream and snapshot.
 * - When the last subscriber leaves, the stream stays open for a grace
 *   period so React Strict-Mode mount/unmount doesn't tear it down.
 * - Once the stream completes (or errors), the snapshot is cached and
 *   future subscribers receive it synchronously without a new request.
 *
 * Stream opens are still funneled through `runWhenInsightSlotAvailable`
 * so different keys still go one-at-a-time (helps with 429s).
 */

import { runStreamSequentially } from "@/lib/requestQueue";
import {
  buildGenerateInsightUrl,
  type PmHourlyPoint,
  type PmHourAggregatePoint,
  type AqiCategoryBucket,
  type StreamReading,
  type LlmSummaryPayload,
} from "@/lib/insightStream";

export interface InsightSnapshot {
  totalRecords: number | null;
  pmHourly: PmHourlyPoint[];
  pmHourAggregate: PmHourAggregatePoint[];
  aqiDistribution: AqiCategoryBucket[];
  llmSummary: LlmSummaryPayload | null;
  readings: StreamReading[];
  done: boolean;
  error: string | null;
}

export const EMPTY_SNAPSHOT: InsightSnapshot = {
  totalRecords: null,
  pmHourly: [],
  pmHourAggregate: [],
  aqiDistribution: [],
  llmSummary: null,
  readings: [],
  done: false,
  error: null,
};

interface Entry {
  snapshot: InsightSnapshot;
  subscribers: Set<(s: InsightSnapshot) => void>;
  es: EventSource | null;
  releaseSlot: (() => void) | null;
  closeTimer: ReturnType<typeof setTimeout> | null;
  starting: boolean;
}

const STRICT_MODE_GRACE_MS = 30_000;
const cache = new Map<string, Entry>();

function keyOf(siteId: string, startDate: string, endDate: string) {
  return `${siteId}|${startDate}|${endDate}`;
}

function getEntry(key: string): Entry {
  let entry = cache.get(key);
  if (!entry) {
    entry = {
      snapshot: { ...EMPTY_SNAPSHOT },
      subscribers: new Set(),
      es: null,
      releaseSlot: null,
      closeTimer: null,
      starting: false,
    };
    cache.set(key, entry);
  }
  return entry;
}

function notify(entry: Entry) {
  for (const s of Array.from(entry.subscribers)) s(entry.snapshot);
}

function update(entry: Entry, partial: Partial<InsightSnapshot>) {
  entry.snapshot = { ...entry.snapshot, ...partial };
  notify(entry);
}

function releaseAndClose(entry: Entry) {
  if (entry.es) {
    try {
      entry.es.close();
    } catch {
      /* ignore */
    }
    entry.es = null;
  }
  entry.starting = false;
  const r = entry.releaseSlot;
  entry.releaseSlot = null;
  r?.();
}

function startStream(key: string, siteId: string, startDate: string, endDate: string) {
  const entry = getEntry(key);
  if (
    entry.es ||
    entry.starting ||
    entry.snapshot.done ||
    entry.snapshot.error
  ) {
    return;
  }
  entry.starting = true;

  runStreamSequentially((release) => {
    if (entry.subscribers.size === 0) {
      entry.starting = false;
      release();
      return;
    }
    entry.releaseSlot = release;

    let es: EventSource;
    try {
      es = new EventSource(buildGenerateInsightUrl(siteId, startDate, endDate));
    } catch (e) {
      update(entry, {
        error: e instanceof Error ? e.message : "Failed to open insight stream",
      });
      releaseAndClose(entry);
      return;
    }
    entry.es = es;

    es.addEventListener("error", () => {
      if (entry.snapshot.done) return;
      update(entry, {
        error:
          "Insight stream error — check the API, CORS, and that the endpoint supports EventSource (SSE).",
      });
      releaseAndClose(entry);
    });

    es.addEventListener("total_records", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as { total_records?: number };
        if (typeof j.total_records === "number") {
          update(entry, { totalRecords: j.total_records });
        }
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("pm_hourly", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as { pm_hourly?: PmHourlyPoint[] };
        if (Array.isArray(j.pm_hourly)) update(entry, { pmHourly: j.pm_hourly });
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("pm_hour_aggregate", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as { pm_hour_aggregate?: PmHourAggregatePoint[] };
        if (Array.isArray(j.pm_hour_aggregate)) {
          update(entry, { pmHourAggregate: j.pm_hour_aggregate });
        }
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("aqi_category_distribution", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as {
          aqi_category_distribution?: AqiCategoryBucket[];
        };
        if (Array.isArray(j.aqi_category_distribution)) {
          update(entry, { aqiDistribution: j.aqi_category_distribution });
        }
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("llm_summary", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as LlmSummaryPayload;
        if (j && "bullets" in j) {
          update(entry, {
            llmSummary: {
              bullets: Array.isArray(j.bullets) ? j.bullets : [],
              error: j.error ?? null,
            },
          });
        }
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("readings", ((e: MessageEvent) => {
      try {
        const j = JSON.parse(e.data) as { readings?: StreamReading[] };
        if (Array.isArray(j.readings)) update(entry, { readings: j.readings });
      } catch {
        /* ignore */
      }
    }) as EventListener);

    es.addEventListener("complete", () => {
      update(entry, { done: true });
      releaseAndClose(entry);
    });
  });
}

export function getCachedInsightSnapshot(
  siteId: string,
  startDate: string,
  endDate: string
): InsightSnapshot {
  if (!siteId) return EMPTY_SNAPSHOT;
  const entry = cache.get(keyOf(siteId, startDate, endDate));
  return entry ? entry.snapshot : EMPTY_SNAPSHOT;
}

export function subscribeInsight(
  siteId: string,
  startDate: string,
  endDate: string,
  listener: (s: InsightSnapshot) => void
): () => void {
  if (!siteId) {
    listener(EMPTY_SNAPSHOT);
    return () => {};
  }
  const key = keyOf(siteId, startDate, endDate);
  const entry = getEntry(key);

  if (entry.closeTimer) {
    clearTimeout(entry.closeTimer);
    entry.closeTimer = null;
  }

  entry.subscribers.add(listener);
  listener(entry.snapshot);

  if (
    !entry.es &&
    !entry.starting &&
    !entry.snapshot.done &&
    !entry.snapshot.error
  ) {
    startStream(key, siteId, startDate, endDate);
  }

  return () => {
    entry.subscribers.delete(listener);
    if (entry.subscribers.size > 0) return;

    if (entry.snapshot.done || entry.snapshot.error) return;

    entry.closeTimer = setTimeout(() => {
      entry.closeTimer = null;
      if (entry.subscribers.size > 0) return;
      if (entry.snapshot.done || entry.snapshot.error) return;
      releaseAndClose(entry);
      cache.delete(key);
    }, STRICT_MODE_GRACE_MS);
  };
}
