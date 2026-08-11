import type { Biomarker } from "../types/db";

const PHENOAGE_INPUT_KEYS = [
  "albumin",
  "creatinine",
  "fasting_glucose",
  "hscrp",
  "lymphocyte_pct",
  "mcv",
  "rdw",
  "alp",
  "wbc",
] as const;

function findValue(biomarkers: Biomarker[], key: string): number | null {
  return biomarkers.find((b) => b.key === key)?.value ?? null;
}

/** Which of the 9 required inputs aren't captured yet, for "what's still missing" UI. */
export function missingPhenoAgeInputs(biomarkers: Biomarker[]): string[] {
  return PHENOAGE_INPUT_KEYS.filter((key) => findValue(biomarkers, key) === null);
}

/**
 * Levine et al. 2018, "An epigenetic biomarker of aging for lifespan and
 * healthspan" (Aging, 10(4):573-591) -- "Phenotypic Age", a validated
 * biological-age estimate built from 9 routine blood biomarkers plus
 * chronological age. In the original NHANES-derived cohort it predicted
 * all-cause mortality better than chronological age alone, and the same
 * formula and coefficients are reproduced consistently across independent
 * implementations (e.g. the open-source "biolearn" toolkit). This is a
 * direct implementation of the published Gompertz-based formula -- unlike
 * the vascular/metabolic age clocks elsewhere in this app (lib/ai/ageClocks.ts),
 * which are our own simplified adaptations, this one is the real published
 * model, not a reinterpretation of it.
 *
 * Requires all 9 inputs; returns null if any are missing rather than
 * substituting a population average or guessing -- a partial PhenoAge
 * computed from 6 of 9 inputs isn't the validated model, it's a different,
 * unvalidated number that happens to use the same formula shape.
 *
 * Units expected by the published formula: albumin g/L, creatinine µmol/L,
 * glucose mmol/L, CRP mg/L, lymphocyte %, MCV fL, RDW %, ALP U/L, WBC
 * 10³/µL, age in years. This app already stores creatinine in µmol/L and
 * hs-CRP in mg/L (lib/ai/labCatalog.ts), so only fasting glucose (stored in
 * mg/dL) needs converting here.
 */
export function computePhenoAge(biomarkers: Biomarker[], chronologicalAge: number): number | null {
  if (missingPhenoAgeInputs(biomarkers).length > 0) return null;

  const albumin = findValue(biomarkers, "albumin")!;
  const creatinine = findValue(biomarkers, "creatinine")!;
  const glucoseMgDl = findValue(biomarkers, "fasting_glucose")!;
  const crp = findValue(biomarkers, "hscrp")!;
  const lymphocytePct = findValue(biomarkers, "lymphocyte_pct")!;
  const mcv = findValue(biomarkers, "mcv")!;
  const rdw = findValue(biomarkers, "rdw")!;
  const alp = findValue(biomarkers, "alp")!;
  const wbc = findValue(biomarkers, "wbc")!;

  const glucoseMmolL = glucoseMgDl / 18.02;
  // CRP floored at a small positive epsilon before the log transform -- ln(0)
  // is undefined, and a true zero doesn't occur on a real hs-CRP assay
  // (reported as e.g. "<0.1" rather than 0).
  const crpSafe = Math.max(crp, 0.01);

  const xb =
    -19.907 -
    0.0336 * albumin +
    0.0095 * creatinine +
    0.1953 * glucoseMmolL +
    0.0954 * Math.log(crpSafe) -
    0.012 * lymphocytePct +
    0.0268 * mcv +
    0.3306 * rdw +
    0.00188 * alp +
    0.0554 * wbc +
    0.0804 * chronologicalAge;

  const GAMMA = 0.0076927;
  const mortalityScore = 1 - Math.exp((-Math.exp(xb) * (Math.exp(120 * GAMMA) - 1)) / GAMMA);
  const age = 141.50225 + Math.log(-0.00553 * Math.log(1 - mortalityScore)) / 0.090165;

  return Math.round(age * 10) / 10;
}
