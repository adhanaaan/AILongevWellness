import type { Pillar } from "../types/db";

export interface LabCatalogEntry {
  key: string;
  label: string;
  pillar: Pillar;
  unit: string;
  ref_low: number;
  ref_high: number;
}

// The subset of our biomarker vocabulary that comes from a standard blood panel —
// the only keys /api/extract-lab.ts will accept from the model's output. Ref ranges
// are ours (not the model's), so a flagged result is always computed consistently.
export const LAB_CATALOG: LabCatalogEntry[] = [
  { key: "total_cholesterol", label: "Total cholesterol", pillar: "vascular", unit: "mmol/L", ref_low: 2.5, ref_high: 5.2 },
  { key: "ldl_c", label: "LDL cholesterol", pillar: "vascular", unit: "mmol/L", ref_low: 1.0, ref_high: 3.0 },
  { key: "hdl_c", label: "HDL cholesterol", pillar: "vascular", unit: "mmol/L", ref_low: 1.0, ref_high: 2.5 },
  { key: "hscrp", label: "hs-CRP", pillar: "vascular", unit: "mg/L", ref_low: 0, ref_high: 3.0 },
  { key: "fasting_glucose", label: "Fasting glucose", pillar: "metabolic", unit: "mg/dL", ref_low: 70, ref_high: 99 },
  { key: "hba1c", label: "HbA1c", pillar: "metabolic", unit: "%", ref_low: 4.0, ref_high: 5.7 },
  { key: "vitamin_d", label: "Vitamin D", pillar: "metabolic", unit: "nmol/L", ref_low: 50, ref_high: 125 },
];

export const LAB_CATALOG_BY_KEY: Record<string, LabCatalogEntry> = Object.fromEntries(
  LAB_CATALOG.map((e) => [e.key, e])
);
