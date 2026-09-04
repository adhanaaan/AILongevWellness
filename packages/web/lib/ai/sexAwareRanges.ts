import type { Sex } from "../types/db";

interface Range {
  ref_low: number;
  ref_high: number;
}

// ACE (American Council on Exercise) body composition chart defines
// meaningfully different healthy ranges by sex (essential fat through the
// "acceptable" category) -- a single unisex band incorrectly flags healthy
// values, especially for women, whose healthy range sits materially higher.
const BODY_FAT_PCT_BY_SEX: Record<Sex, Range> = {
  male: { ref_low: 8, ref_high: 24 },
  female: { ref_low: 21, ref_high: 31 },
  // No single-sex chart applies -- span both rather than guessing which one.
  other: { ref_low: 8, ref_high: 31 },
};

// WHO's 2008 expert consultation sets the healthy waist-to-hip ratio ceiling
// at 0.90 for men and 0.85 for women (no floor is defined by WHO; 0.7 is kept
// as a display floor for both, same as before this fix).
const WAIST_HIP_RATIO_BY_SEX: Record<Sex, Range> = {
  male: { ref_low: 0.7, ref_high: 0.9 },
  female: { ref_low: 0.7, ref_high: 0.85 },
  other: { ref_low: 0.7, ref_high: 0.9 },
};

// Both NCEP ATP III and IDF define LOW HDL sex-specifically: men < 1.03 mmol/L
// (40 mg/dL), women < 1.29 mmol/L (50 mg/dL). A single unisex 1.0 floor
// under-flags low HDL in women (a woman at 1.1 mmol/L is low by guideline but
// scored healthy). HDL is higher-is-better (lib/ai/markerDirection.ts), so only
// ref_low drives flagging/scoring; ref_high (the catalog display ceiling, 2.5)
// stays unisex and only sets the score band width. Sex unknown -> use the less
// aggressive male floor so we don't over-flag.
const HDL_C_BY_SEX: Record<Sex, Range> = {
  male: { ref_low: 1.03, ref_high: 2.5 },
  female: { ref_low: 1.29, ref_high: 2.5 },
  other: { ref_low: 1.03, ref_high: 2.5 },
};

const SEX_AWARE_KEYS: Record<string, Record<Sex, Range>> = {
  body_fat_pct: BODY_FAT_PCT_BY_SEX,
  waist_hip_ratio: WAIST_HIP_RATIO_BY_SEX,
  hdl_c: HDL_C_BY_SEX,
};

/** Returns the sex-specific reference range for keys that have one, otherwise the catalog default. */
export function sexAwareRange(key: string, sex: Sex | null | undefined, fallback: Range): Range {
  const bySex = SEX_AWARE_KEYS[key];
  if (!bySex) return fallback;
  return bySex[sex ?? "other"];
}
