import type { Pillar } from "../types/db";

export interface WearableCatalogEntry {
  key: string;
  label: string;
  pillar: Pillar;
  unit: string;
  ref_low: number;
  ref_high: number;
}

// Biomarker keys we can reliably pull out of an Apple Health export — matches the
// canonical vocabulary already used elsewhere (mock.ts's BIOMARKER_TEMPLATES,
// lib/ai/scoring.ts's BIOMARKER_KEYS_BY_PILLAR), so these slot into the exact
// same pillar-scoring and card-rendering path as lab-extracted biomarkers.
export const WEARABLE_CATALOG: WearableCatalogEntry[] = [
  { key: "resting_hr", label: "Resting heart rate", pillar: "vascular", unit: "bpm", ref_low: 50, ref_high: 80 },
  { key: "hrv", label: "Heart rate variability", pillar: "vascular", unit: "ms", ref_low: 40, ref_high: 70 },
  { key: "systolic_bp", label: "Systolic blood pressure", pillar: "vascular", unit: "mmHg", ref_low: 90, ref_high: 120 },
  { key: "diastolic_bp", label: "Diastolic blood pressure", pillar: "vascular", unit: "mmHg", ref_low: 60, ref_high: 80 },
  { key: "bmi", label: "BMI", pillar: "metabolic", unit: "kg/m²", ref_low: 18.5, ref_high: 25 },
  { key: "body_fat_pct", label: "Body fat %", pillar: "metabolic", unit: "%", ref_low: 8, ref_high: 25 },
  { key: "sleep_hours", label: "Sleep duration", pillar: "mental", unit: "hours", ref_low: 7, ref_high: 9 },
  { key: "sleep_quality", label: "Sleep quality index", pillar: "mental", unit: "/100", ref_low: 70, ref_high: 100 },
];

export const WEARABLE_CATALOG_BY_KEY: Record<string, WearableCatalogEntry> = Object.fromEntries(
  WEARABLE_CATALOG.map((e) => [e.key, e])
);
