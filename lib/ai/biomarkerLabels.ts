import { LAB_CATALOG_BY_KEY } from "./labCatalog";
import { BODY_COMP_CATALOG_BY_KEY } from "./bodyCompCatalog";
import { RECOGNIZE_CATALOG_BY_KEY } from "./recognizeCatalog";
import { QUESTIONNAIRE_CATALOG_BY_KEY } from "./mentalQuestionnaire";
import { WEARABLE_CATALOG_BY_KEY } from "./wearableCatalog";

// One place to turn a biomarker KEY into a human label. Captured biomarkers
// already carry a .label, but "not yet captured" lists only have the bare key —
// titleizing it produces junk like "Who5 wellbeing" / "Hdl c" / "Systolic bp".
// This resolves the real label from whichever catalog defines the key, and only
// falls back to a cleaned-up title case for the few keys no catalog owns.

// Keys that live only in the mock templates / scoring vocabulary, with no formal
// catalog of their own.
const EXTRA_LABELS: Record<string, string> = {
  stress_index: "Stress index",
  stress_level: "Stress level",
  exercise_freq: "Exercise frequency",
};

function titleize(key: string): string {
  const withSpaces = key.replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export function biomarkerLabel(key: string): string {
  return (
    LAB_CATALOG_BY_KEY[key]?.label ??
    BODY_COMP_CATALOG_BY_KEY[key]?.label ??
    RECOGNIZE_CATALOG_BY_KEY[key]?.label ??
    QUESTIONNAIRE_CATALOG_BY_KEY[key]?.label ??
    WEARABLE_CATALOG_BY_KEY[key]?.label ??
    EXTRA_LABELS[key] ??
    titleize(key)
  );
}
