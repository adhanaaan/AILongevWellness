import type { Pillar } from "../types/db";

export interface BodyCompCatalogEntry {
  key: string;
  label: string;
  pillar: Pillar;
  unit: string;
  ref_low: number;
  ref_high: number;
}

// A body composition scan (InBody-style kiosk printout, DEXA, etc.) typically
// reports many more numbers than this, but only these four have a scored
// meaning elsewhere in the app (lib/ai/scoring.ts's metabolic pillar list) --
// narrower than this would just be extracting numbers nothing downstream uses.
export const BODY_COMP_CATALOG: BodyCompCatalogEntry[] = [
  { key: "bmi", label: "BMI", pillar: "metabolic", unit: "kg/m²", ref_low: 18.5, ref_high: 25 },
  { key: "body_fat_pct", label: "Body fat %", pillar: "metabolic", unit: "%", ref_low: 8, ref_high: 25 },
  { key: "visceral_fat", label: "Visceral fat", pillar: "metabolic", unit: "level", ref_low: 1, ref_high: 12 },
  { key: "waist_hip_ratio", label: "Waist-to-hip ratio", pillar: "metabolic", unit: "ratio", ref_low: 0.7, ref_high: 0.9 },
];

export const BODY_COMP_CATALOG_BY_KEY: Record<string, BodyCompCatalogEntry> = Object.fromEntries(
  BODY_COMP_CATALOG.map((e) => [e.key, e])
);
