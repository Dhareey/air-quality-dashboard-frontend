export { buildGenerateInsightUrl } from "./apiBase";

export interface PmHourlyPoint {
  time: string;
  pm2_5: number;
}

export interface PmHourAggregatePoint {
  hour: string;
  pm25: number;
}

export interface AqiCategoryBucket {
  name: string;
  count: number;
}

export interface StreamReading {
  datetime: string;
  country: string;
  city: string;
  site_id: string;
  device_id: string;
  pm2_5: number;
  pm10: number;
  aqi_category: string;
}

export interface LlmSummaryPayload {
  bullets: string[];
  error: string | null;
}
