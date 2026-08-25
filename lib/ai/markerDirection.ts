// Direction-aware biomarker scoring/flagging.
//
// Most reference ranges are two-sided (both bounds are "bad" — e.g. TSH, MCV),
// but for a fit-executive audience many markers are genuinely one-directional:
// crossing ONE bound is GOOD, not a problem. HRV 85ms (above the 70 ceiling),
// resting HR 45bpm (below the 50 floor), or a 230ms reaction time (below the
// 250 floor) are excellent readings that the old two-sided logic wrongly
// penalized and flagged. This module centralizes which markers are one-sided so
// scoring and flagging agree everywhere (the mock and the real backend both read
// from here — see CLAUDE.md rule #3, mock↔real parity).
//
// Only markers that are CLEARLY one-directional are listed. Anything omitted
// stays two-sided (current behavior). Keys are verified against
// lib/ai/labCatalog.ts, lib/ai/bodyCompCatalog.ts, lib/ai/recognizeCatalog.ts
// and lib/data/writeWearableBiomarkers.ts's WEARABLE_CATALOG.

export type MarkerDirection = "higher" | "lower";

export const MARKER_DIRECTION: Record<string, MarkerDirection> = {
  // Higher is better — only the low bound is "bad".
  hdl_c: "higher",
  egfr: "higher",
  albumin: "higher",
  vitamin_b12: "higher",
  vitamin_d: "higher",
  hrv: "higher",
  vo2max: "higher",
  cog_composite: "higher",
  who5_wellbeing: "higher",
  cgm_time_in_range: "higher",

  // Lower is better — only the high bound is "bad".
  resting_hr: "lower",
  reaction_time: "lower",
  pss4_stress: "lower",
  ldl_c: "lower",
  triglycerides: "lower",
  hscrp: "lower",
  homocysteine: "lower",
  lpa: "lower",
  fasting_glucose: "lower",
  hba1c: "lower",
  fasting_insulin: "lower",
  uric_acid: "lower",
  alt: "lower",
  ast: "lower",
  rdw: "lower",
  cgm_variability: "lower",
  cgm_gmi: "lower",
  cgm_time_above_range: "lower",
  cgm_time_below_range: "lower",
  visceral_fat: "lower",
  waist_hip_ratio: "lower",
  total_cholesterol: "lower",
};

/**
 * Flagged only when the value is past the BAD bound:
 * - higher-is-better: flag when below ref_low (being above ref_high is good)
 * - lower-is-better:  flag when above ref_high (being below ref_low is good)
 * - two-sided:        flag when outside either bound (current behavior)
 */
export function isMarkerFlagged(key: string, value: number, refLow: number, refHigh: number): boolean {
  const dir = MARKER_DIRECTION[key];
  if (dir === "higher") return value < refLow;
  if (dir === "lower") return value > refHigh;
  return value < refLow || value > refHigh;
}

/**
 * 100 when the value is on the good side of / within range; degrades toward 0
 * the further PAST THE BAD BOUND it falls. Reuses the exact overshoot curve the
 * old two-sided markerScore used (scoring.ts) — just one-sided per direction, so
 * a reading that's "too good" (past the good bound) is never penalized.
 */
export function scoreMarker(key: string, value: number, refLow: number, refHigh: number): number {
  if (!isMarkerFlagged(key, value, refLow, refHigh)) return 100;
  const band = refHigh - refLow;
  if (band <= 0) return 100;
  const distance = value < refLow ? refLow - value : value - refHigh;
  const overshoot = distance / band;
  return Math.max(0, Math.round(100 - overshoot * 100));
}
