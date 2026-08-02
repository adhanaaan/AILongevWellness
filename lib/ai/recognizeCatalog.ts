import type { Pillar } from "../types/db";

export interface RecognizeCatalogEntry {
  key: string;
  label: string;
  pillar: Pillar;
  unit: string;
  ref_low: number;
  ref_high: number;
}

// The two mental-pillar keys a reaction-time assessment can actually produce
// (lib/ai/scoring.ts already scores both).
export const RECOGNIZE_CATALOG: RecognizeCatalogEntry[] = [
  { key: "reaction_time", label: "Cognitive reaction time", pillar: "mental", unit: "ms", ref_low: 250, ref_high: 400 },
  { key: "cog_composite", label: "Cognitive composite score", pillar: "mental", unit: "/100", ref_low: 70, ref_high: 100 },
];

export const RECOGNIZE_CATALOG_BY_KEY: Record<string, RecognizeCatalogEntry> = Object.fromEntries(
  RECOGNIZE_CATALOG.map((e) => [e.key, e])
);
