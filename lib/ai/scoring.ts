import type { Biomarker, OutOfRangeBiomarker, Pillar, PillarScores } from "../types/db";

// The full biomarker vocabulary the platform knows how to score, by pillar —
// used to report which ones are still missing for a participant, regardless
// of which capture channel would eventually supply them.
export const BIOMARKER_KEYS_BY_PILLAR: Record<Pillar, string[]> = {
  vascular: ["systolic_bp", "diastolic_bp", "resting_hr", "hrv", "total_cholesterol", "ldl_c", "hdl_c", "hscrp"],
  metabolic: ["fasting_glucose", "hba1c", "waist_hip_ratio", "bmi", "body_fat_pct", "visceral_fat", "vitamin_d"],
  mental: ["reaction_time", "cog_composite", "sleep_quality", "sleep_hours", "stress_index", "stress_level", "exercise_freq"],
};

const NEUTRAL_SCORE = 70;

/** 100 if within range; degrades toward 0 the further outside [ref_low, ref_high] the value falls. */
function markerScore(b: Biomarker): number {
  if (!b.flagged || b.ref_low === null || b.ref_high === null || b.value === null) return 100;
  const band = b.ref_high - b.ref_low;
  if (band <= 0) return 100;
  const distance = b.value < b.ref_low ? b.ref_low - b.value : b.value - b.ref_high;
  const overshoot = distance / band;
  return Math.max(0, Math.round(100 - overshoot * 100));
}

/**
 * Deterministic, explainable scoring from whatever biomarkers are actually on
 * file — not an LLM call, so the same inputs always produce the same score.
 * A pillar with zero captured biomarkers gets a neutral default rather than 0,
 * since "no data yet" isn't the same as "unwell".
 */
export function computePillarScores(biomarkers: Biomarker[]): PillarScores {
  const scores = {} as PillarScores;
  for (const pillar of Object.keys(BIOMARKER_KEYS_BY_PILLAR) as Pillar[]) {
    const present = biomarkers.filter((b) => b.pillar === pillar && b.value !== null);
    scores[pillar] = present.length === 0 ? NEUTRAL_SCORE : Math.round(present.reduce((sum, b) => sum + markerScore(b), 0) / present.length);
  }
  return scores;
}

/** Chronological age nudged by how far the average pillar score sits from a neutral 70. */
export function computeBiologicalAge(scores: PillarScores, chronologicalAge: number): number {
  const avg = (scores.vascular + scores.metabolic + scores.mental) / 3;
  const delta = Math.max(-15, Math.min(10, Math.round(avg - NEUTRAL_SCORE)));
  return chronologicalAge - delta;
}

export function computeOutOfRange(biomarkers: Biomarker[]): OutOfRangeBiomarker[] {
  return biomarkers
    .filter((b) => b.flagged && b.value !== null && b.ref_high !== null)
    .map((b) => ({ key: b.key, value: b.value as number, ref_high: b.ref_high as number }));
}

export function computeMissingBiomarkers(biomarkers: Biomarker[]): string[] {
  const present = new Set(biomarkers.filter((b) => b.value !== null).map((b) => b.key));
  return Object.values(BIOMARKER_KEYS_BY_PILLAR)
    .flat()
    .filter((key) => !present.has(key));
}
