import type { AQICategory } from "./aqi";

const API_TO_UI: Record<string, AQICategory> = {
  Good: "Good",
  Moderate: "Moderate",
  "Unhealthy for Sensitive Groups": "Unhealthy for Sensitive",
  "Unhealthy for Sensitive": "Unhealthy for Sensitive",
  Unhealthy: "Unhealthy",
  "Very Unhealthy": "Very Unhealthy",
  Hazardous: "Hazardous",
};

/** Map insight API / backend labels to the UI’s fixed AQICategory set */
export function mapApiAqiLabelToCategory(name: string): AQICategory {
  const t = name.trim();
  if (t in API_TO_UI) return API_TO_UI[t];
  return t as AQICategory;
}
