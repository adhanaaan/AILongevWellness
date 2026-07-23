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
// Covers what a typical comprehensive executive health panel includes — narrower
// than this misses real values sitting right there in the document.
export const LAB_CATALOG: LabCatalogEntry[] = [
  // Vascular
  { key: "total_cholesterol", label: "Total cholesterol", pillar: "vascular", unit: "mmol/L", ref_low: 2.5, ref_high: 5.2 },
  { key: "ldl_c", label: "LDL cholesterol", pillar: "vascular", unit: "mmol/L", ref_low: 1.0, ref_high: 3.0 },
  { key: "hdl_c", label: "HDL cholesterol", pillar: "vascular", unit: "mmol/L", ref_low: 1.0, ref_high: 2.5 },
  { key: "triglycerides", label: "Triglycerides", pillar: "vascular", unit: "mmol/L", ref_low: 0, ref_high: 1.7 },
  { key: "hscrp", label: "hs-CRP", pillar: "vascular", unit: "mg/L", ref_low: 0, ref_high: 3.0 },
  { key: "homocysteine", label: "Homocysteine", pillar: "vascular", unit: "µmol/L", ref_low: 5, ref_high: 15 },
  { key: "lpa", label: "Lipoprotein(a)", pillar: "vascular", unit: "mg/dL", ref_low: 0, ref_high: 30 },

  // Metabolic
  { key: "fasting_glucose", label: "Fasting glucose", pillar: "metabolic", unit: "mg/dL", ref_low: 70, ref_high: 99 },
  { key: "hba1c", label: "HbA1c", pillar: "metabolic", unit: "%", ref_low: 4.0, ref_high: 5.7 },
  { key: "fasting_insulin", label: "Fasting insulin", pillar: "metabolic", unit: "µIU/mL", ref_low: 2.6, ref_high: 24.9 },
  { key: "vitamin_d", label: "Vitamin D", pillar: "metabolic", unit: "nmol/L", ref_low: 50, ref_high: 125 },
  { key: "vitamin_b12", label: "Vitamin B12", pillar: "metabolic", unit: "pmol/L", ref_low: 148, ref_high: 616 },
  { key: "ferritin", label: "Ferritin", pillar: "metabolic", unit: "µg/L", ref_low: 30, ref_high: 300 },
  { key: "uric_acid", label: "Uric acid", pillar: "metabolic", unit: "µmol/L", ref_low: 155, ref_high: 357 },
  { key: "alt", label: "ALT (liver)", pillar: "metabolic", unit: "U/L", ref_low: 7, ref_high: 56 },
  { key: "ast", label: "AST (liver)", pillar: "metabolic", unit: "U/L", ref_low: 8, ref_high: 48 },
  { key: "creatinine", label: "Creatinine", pillar: "metabolic", unit: "µmol/L", ref_low: 60, ref_high: 110 },
  { key: "egfr", label: "eGFR (kidney function)", pillar: "metabolic", unit: "mL/min/1.73m²", ref_low: 90, ref_high: 200 },
  { key: "tsh", label: "TSH (thyroid)", pillar: "metabolic", unit: "mIU/L", ref_low: 0.4, ref_high: 4.0 },

  // CGM (continuous glucose monitor) summary stats — a different document shape
  // (e.g. a Buzud/Freestyle/Dexcom export) but same upload path and pillar as
  // the rest of the metabolic panel, so it lives in the same catalog.
  { key: "cgm_avg_glucose", label: "Average glucose (CGM)", pillar: "metabolic", unit: "mg/dL", ref_low: 70, ref_high: 140 },
  { key: "cgm_gmi", label: "Glucose Management Indicator", pillar: "metabolic", unit: "%", ref_low: 4.0, ref_high: 7.0 },
  { key: "cgm_variability", label: "Glucose variability (%CV)", pillar: "metabolic", unit: "%", ref_low: 0, ref_high: 36 },
  { key: "cgm_time_in_range", label: "Time in range (CGM)", pillar: "metabolic", unit: "%", ref_low: 70, ref_high: 100 },
  { key: "cgm_time_above_range", label: "Time above range (CGM)", pillar: "metabolic", unit: "%", ref_low: 0, ref_high: 25 },
  { key: "cgm_time_below_range", label: "Time below range (CGM)", pillar: "metabolic", unit: "%", ref_low: 0, ref_high: 4 },
];

export const LAB_CATALOG_BY_KEY: Record<string, LabCatalogEntry> = Object.fromEntries(
  LAB_CATALOG.map((e) => [e.key, e])
);
