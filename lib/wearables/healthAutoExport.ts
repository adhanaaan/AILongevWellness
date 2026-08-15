import type { ParsedWearableValue } from "../data/writeWearableBiomarkers";

// Normalizes the "Health Auto Export – JSON+CSV" iOS app's REST payload into our
// biomarker vocabulary. Payload shape: { data: { metrics: [ {name, units,
// data:[{qty,date}...] } ] } }. Most metrics use {qty,date}; Sleep Analysis
// items carry hour fields (totalSleep/asleep/...).
//
// NOTE: the exact metric `name` strings for a few of these (resting HR, HRV,
// body fat) are the documented lowercase-snake_case convention but were not
// verifiable from an authoritative enumeration — api/health-ingest echoes the
// metric names it saw so they can be confirmed against a real payload, and this
// map is trivial to extend once confirmed.

const METRIC_TO_KEY: Record<string, string> = {
  resting_heart_rate: "resting_hr",
  heart_rate_variability: "hrv",
  body_fat_percentage: "body_fat_pct",
  // sleep_analysis is handled specially below (hours, not {qty}).
};

export interface HaeNormalizeResult {
  values: ParsedWearableValue[];
  /** Every metric name present in the payload — surfaced so unverified name→key mappings can be confirmed live. */
  metricNames: string[];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function normalizeHealthAutoExport(payload: any): HaeNormalizeResult {
  const metrics: any[] = payload?.data?.metrics ?? [];
  const metricNames = metrics.map((m) => String(m?.name ?? "")).filter(Boolean);
  const values: ParsedWearableValue[] = [];

  for (const metric of metrics) {
    const name = String(metric?.name ?? "");
    const points: any[] = Array.isArray(metric?.data) ? metric.data : [];
    if (points.length === 0) continue;

    if (name === "sleep_analysis") {
      const hrs = avg(
        points
          .map((p) => num(p?.totalSleep) ?? num(p?.asleep))
          .filter((n): n is number => n !== null)
      );
      if (hrs !== null) values.push({ key: "sleep_hours", value: hrs });
      continue;
    }

    const key = METRIC_TO_KEY[name];
    if (!key) continue;

    // Point metrics use {qty}; heart-rate-family items use Min/Avg/Max.
    let value = avg(
      points.map((p) => num(p?.qty) ?? num(p?.Avg)).filter((n): n is number => n !== null)
    );
    if (value === null) continue;
    // HealthKit body fat can arrive as a 0-1 fraction; our catalog wants a percent.
    if (key === "body_fat_pct" && value > 0 && value <= 1) value = value * 100;
    values.push({ key, value });
  }

  return { values, metricNames };
}
