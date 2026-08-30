// Symbol-Digit Matching test — scoring helpers, shared by the client game
// (components/onboarding/SymbolDigitGame.tsx) and the server (api/submit-mental.ts).
// No React Native imports here so it's safe to import from a Vercel function.
//
// The test is a Symbol-Digit Modalities-style task (ported from the recognaizelite
// "lite-two" cognitive game): a key maps 10 symbols to the digits 0-9, one symbol
// is shown at a time, and the participant taps its matching digit. It runs for a
// fixed 60 seconds. Raw score = correct - errors.

export const SDMT_DURATION_SECONDS = 60;
export const SDMT_SYMBOL_COUNT = 10;

/** Raw Symbol-Digit score: net correct matches, floored at 0. */
export function sdmtScore(correct: number, errors: number): number {
  return Math.max(0, Math.round(correct) - Math.round(errors));
}

/**
 * Map the raw Symbol-Digit score onto the 0-100 cognitive-composite scale the
 * Mental pillar already scores (lib/ai/scoring.ts, `cog_composite`, ref band
 * 70-100). This is a WELLNESS HEURISTIC, not a validated norm: anchored so a net
 * ~23 matches in 60s reads as ~70 ("on track") and ~46 reads as 100, linear and
 * clamped. Documented as a heuristic on the Methodology page, like the other
 * derived cognitive numbers.
 */
export function sdmtToComposite(correct: number, errors: number): number {
  const score = sdmtScore(correct, errors);
  return Math.max(0, Math.min(100, Math.round(40 + score * 1.3)));
}
