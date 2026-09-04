import { XMLParser } from "fast-xml-parser";
import { WEARABLE_CATALOG_BY_KEY } from "./wearableCatalog";

export interface ParsedWearableValue {
  key: string;
  value: number;
}

// Maps Apple HealthKit's quantity-type identifiers (stable, well-documented
// strings baked into every export.xml) to our own biomarker vocabulary.
const HK_QUANTITY_MAP: Record<string, string> = {
  HKQuantityTypeIdentifierRestingHeartRate: "resting_hr",
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: "hrv",
  HKQuantityTypeIdentifierBloodPressureSystolic: "systolic_bp",
  HKQuantityTypeIdentifierBloodPressureDiastolic: "diastolic_bp",
  HKQuantityTypeIdentifierBodyMassIndex: "bmi",
  HKQuantityTypeIdentifierBodyFatPercentage: "body_fat_pct",
};

// Apple Health has no single "sleep quality" metric — this mirrors the same
// hours-to-quality heuristic already used in app/(tabs)/tracking.tsx, so a
// wearable-derived sleep_quality biomarker is computed the same way a
// manually-logged one would be.
function sleepQualityFromHours(hours: number): number {
  return Math.max(0, Math.min(100, Math.round(((hours - 5) / 4) * 100)));
}

/**
 * Parses the raw export.xml from an "Export All Health Data" zip. Best-effort:
 * unrecognized record types are ignored, malformed records are skipped rather
 * than failing the whole parse. Returns the most recent reading for point-in-time
 * metrics (resting HR, HRV, BMI, etc.) and the most recent night's total for sleep.
 */
export function parseAppleHealthExport(xml: string): ParsedWearableValue[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const rawRecords = doc?.HealthData?.Record;
  const records: any[] = Array.isArray(rawRecords) ? rawRecords : rawRecords ? [rawRecords] : [];

  const latestByKey = new Map<string, { time: number; value: number }>();
  const sleepMinutesByDay = new Map<string, number>();

  for (const r of records) {
    try {
      const type = r["@_type"];
      const startDate = r["@_startDate"];
      const endDate = r["@_endDate"];

      if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
        if (/asleep/i.test(String(r["@_value"] ?? ""))) {
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).getTime();
          if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
            // A night's sleep usually starts before midnight and ends after —
            // shifting by 12h before truncating to a date buckets the whole
            // night under the day the person woke up, instead of splitting it
            // across two calendar-day buckets.
            const day = new Date(start + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
            sleepMinutesByDay.set(day, (sleepMinutesByDay.get(day) ?? 0) + (end - start) / 60000);
          }
        }
        continue;
      }

      const key = HK_QUANTITY_MAP[type];
      if (!key) continue;
      let value = Number(r["@_value"]);
      if (!Number.isFinite(value)) continue;
      // Apple sometimes stores body fat % as a 0-1 fraction rather than 0-100.
      if (key === "body_fat_pct" && value <= 1) value *= 100;

      const time = new Date(startDate).getTime();
      const existing = latestByKey.get(key);
      if (!existing || time > existing.time) {
        latestByKey.set(key, { time, value });
      }
    } catch {
      // Skip malformed records rather than failing the whole export.
    }
  }

  const results: ParsedWearableValue[] = [];
  for (const [key, { value }] of latestByKey) {
    if (WEARABLE_CATALOG_BY_KEY[key]) {
      results.push({ key, value: Math.round(value * 100) / 100 });
    }
  }

  if (sleepMinutesByDay.size > 0) {
    const mostRecentDay = [...sleepMinutesByDay.keys()].sort().pop()!;
    const hours = Math.round((sleepMinutesByDay.get(mostRecentDay)! / 60) * 10) / 10;
    if (hours > 0) {
      results.push({ key: "sleep_hours", value: hours });
      results.push({ key: "sleep_quality", value: sleepQualityFromHours(hours) });
    }
  }

  return results;
}
