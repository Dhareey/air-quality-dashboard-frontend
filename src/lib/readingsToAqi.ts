import { AQI_COLORS, type AQIRecord } from "./aqi";
import { mapApiAqiLabelToCategory } from "./aqiCategoryMap";
import type { StreamReading } from "./insightStream";

export function mapStreamReadingsToAqiRecords(readings: StreamReading[]): AQIRecord[] {
  return readings.map((r, i) => {
    const category = mapApiAqiLabelToCategory(r.aqi_category);
    return {
      id: `api-${i}-${r.datetime}`,
      time: r.datetime,
      country: r.country,
      city: r.city,
      region: r.city,
      siteId: r.site_id,
      deviceId: r.device_id,
      pm25: r.pm2_5,
      pm10: r.pm10,
      category,
      colorName: AQI_COLORS[category].label,
      lat: 0,
      lng: 0,
    };
  });
}
