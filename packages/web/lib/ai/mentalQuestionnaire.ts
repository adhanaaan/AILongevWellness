import type { Pillar } from "../types/db";
import type { RecognizeCatalogEntry } from "./recognizeCatalog";

// Two validated, freely-usable self-report instruments that give the Mental
// pillar a real subjective-wellbeing basis alongside the reaction-time proxy:
//
//  - WHO-5 Well-Being Index (WHO 1998; validation review: Topp et al. 2015,
//    Psychother Psychosom 84:167-176). Five positively-framed items, each 0-5
//    over the last two weeks; raw 0-25 x4 = a 0-100 wellbeing percentage.
//    Deliberately a WELLBEING measure, not a depression screen — it fits the
//    "wellness, never diagnosis" positioning. The <=50 threshold is the
//    well-established "low wellbeing" cut-off, used here only as a wellness
//    "worth attention" band, never as a diagnosis.
//
//  - PSS-4 (Cohen & Williamson 1988, the 4-item short form of Cohen et al.
//    1983's Perceived Stress Scale). Four items, each 0-4 over the last month,
//    items 2 & 3 reverse-scored; sum 0-16, higher = more perceived stress.
//    PSS has no official clinical cut-offs, so the reference band below is an
//    explicit WELLNESS heuristic (documented as such on the Methodology page),
//    not a clinical threshold.
//
// Scoring is deterministic and lives here so it's identical everywhere. Only the
// two DERIVED scores are persisted as biomarkers (raw item answers aren't stored,
// mirroring how ReCOGnAIze stores only its derived values) — so no schema change.

export interface QuestionnaireItem {
  id: string;
  text: string;
  /** PSS-4 items 2 & 3 are reverse-scored. */
  reverse?: boolean;
}

export interface ResponseOption {
  label: string;
  value: number;
}

// WHO-5: "Over the last two weeks…", 0 (at no time) → 5 (all of the time).
export const WHO5_OPTIONS: ResponseOption[] = [
  { label: "At no time", value: 0 },
  { label: "Some of the time", value: 1 },
  { label: "Less than half the time", value: 2 },
  { label: "More than half the time", value: 3 },
  { label: "Most of the time", value: 4 },
  { label: "All of the time", value: 5 },
];

export const WHO5_ITEMS: QuestionnaireItem[] = [
  { id: "who5_1", text: "I have felt cheerful and in good spirits" },
  { id: "who5_2", text: "I have felt calm and relaxed" },
  { id: "who5_3", text: "I have felt active and vigorous" },
  { id: "who5_4", text: "I woke up feeling fresh and rested" },
  { id: "who5_5", text: "My daily life has been filled with things that interest me" },
];

// PSS-4: "In the last month, how often have you…", 0 (never) → 4 (very often).
export const PSS4_OPTIONS: ResponseOption[] = [
  { label: "Never", value: 0 },
  { label: "Almost never", value: 1 },
  { label: "Sometimes", value: 2 },
  { label: "Fairly often", value: 3 },
  { label: "Very often", value: 4 },
];

export const PSS4_ITEMS: QuestionnaireItem[] = [
  { id: "pss4_1", text: "…felt that you were unable to control the important things in your life?" },
  { id: "pss4_2", text: "…felt confident about your ability to handle your personal problems?", reverse: true },
  { id: "pss4_3", text: "…felt that things were going your way?", reverse: true },
  { id: "pss4_4", text: "…felt difficulties were piling up so high that you could not overcome them?" },
];

/**
 * WHO-5 → 0-100 wellbeing percentage. Sum of the five 0-5 answers (0-25) × 4.
 * Higher is better. Throws on a malformed response set so a bad client payload
 * can never silently produce a wrong score.
 */
export function scoreWho5(answers: number[]): number {
  if (answers.length !== WHO5_ITEMS.length || !answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 5)) {
    throw new Error("WHO-5 needs exactly 5 answers, each 0-5");
  }
  return answers.reduce((sum, a) => sum + a, 0) * 4;
}

/**
 * PSS-4 → 0-16 perceived-stress score. Items 2 & 3 are reverse-scored (4 − a).
 * Higher is worse (more stress).
 */
export function scorePss4(answers: number[]): number {
  if (answers.length !== PSS4_ITEMS.length || !answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 4)) {
    throw new Error("PSS-4 needs exactly 4 answers, each 0-4");
  }
  return PSS4_ITEMS.reduce((sum, item, i) => sum + (item.reverse ? 4 - answers[i] : answers[i]), 0);
}

// Catalog entries so the derived scores are written as mental biomarkers with the
// right reference bands and flow into computePillarScores like any other marker.
export const QUESTIONNAIRE_CATALOG: RecognizeCatalogEntry[] = [
  // WHO-5: healthy wellbeing ≥ 50 (the standard low-wellbeing cut-off).
  { key: "who5_wellbeing", label: "Wellbeing (WHO-5)", pillar: "mental" as Pillar, unit: "/100", ref_low: 50, ref_high: 100 },
  // PSS-4: wellness "watch" band > 6 (heuristic, not a clinical cut-off).
  { key: "pss4_stress", label: "Perceived stress (PSS-4)", pillar: "mental" as Pillar, unit: "/16", ref_low: 0, ref_high: 6 },
];

export const QUESTIONNAIRE_CATALOG_BY_KEY: Record<string, RecognizeCatalogEntry> = Object.fromEntries(
  QUESTIONNAIRE_CATALOG.map((e) => [e.key, e])
);
