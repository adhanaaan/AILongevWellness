import type { SignedCard } from "../data/repository";
import type { Biomarker } from "../types/db";

const DISCLAIMER = "This is general wellness information, not medical advice.";
const DEFER = "That's a good question for your care team.";
const NOT_ON_CARD = `I don't have that information on your card. ${DEFER}`;

// Heuristic pattern matching for a rule-based mock responder — not real NLU.
const OUT_OF_SCOPE = /diagnos|medicat|prescri|drug|dosage|symptom|disease|treat(ment)?|cure/i;
const COMPARISON = /better than|worse than|compared? to (other|another|everyone|the group|average)|how do i (compare|rank)|versus (other|another)|am i (better|worse)/i;
const OTHER_PARTICIPANT = /\b(other|another) participants?\b|someone else'?s?\b|\banother person'?s?\b|\b(colleague|coworker|friend|spouse|partner)'?s?\s+(score|card|result|data)/i;

const BIOMARKER_TOKEN_MIN_LEN = 3;
const BIOMARKER_STOPWORDS = new Set(["the", "and", "for", "was", "are", "ref"]);

function pillarLine(card: SignedCard, pillar: "vascular" | "metabolic" | "mental") {
  const score = card.aiDraft.scores[pillar];
  const status = score >= 70 ? "in a good range" : "an area your card flags to monitor";
  return `Your ${pillar} score on your reviewed card is ${score}, which is ${status}.`;
}

function biomarkerTokens(label: string): string[] {
  return label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= BIOMARKER_TOKEN_MIN_LEN && !BIOMARKER_STOPWORDS.has(t));
}

/** Looks up a specific biomarker by name/label/key overlap with the message — the grounding rule
 *  is "if found, restate it; if not found, say so" rather than falling back to a generic answer.
 *  Checks `key` too (not just `label`) so short forms like "hrv" or "bmi" match even though the
 *  label spells them out ("Heart rate variability", "BMI"). */
function findBiomarkerMatch(text: string, biomarkers: Biomarker[]): Biomarker | undefined {
  return biomarkers.find((b) => {
    const tokens = [...biomarkerTokens(b.label), ...biomarkerTokens(b.key)];
    return tokens.some((t) => text.includes(t));
  });
}

function describeBiomarker(b: Biomarker): string {
  const rangeNote = b.flagged ? " which your card flags as an area to monitor" : " which is within the reference range on your card";
  return `Your ${b.label.toLowerCase()} is ${b.value} ${b.unit}${rangeNote}. ${DISCLAIMER}`;
}

// A handful of common lab names not covered by our biomarker set — used only to distinguish
// "asking about a specific marker we don't have" from "asking something more general".
const KNOWN_UNTRACKED_MARKERS = /\bcortisol\b|\btestosterone\b|\bthyroid\b|\btsh\b|\bcreatinine\b|\bferritin\b|\bpotassium\b|\bsodium\b|\bestrogen\b|\bpsa\b|\btriglyceride/i;

export function respondAsAva(message: string, card: SignedCard): string {
  const text = message.toLowerCase();

  if (OUT_OF_SCOPE.test(text)) {
    return `I can only talk through what's on your reviewed wellness card — I'm not able to help with diagnoses, medications, or symptoms. ${DEFER}`;
  }

  if (COMPARISON.test(text)) {
    return `I can only discuss your own reviewed card, not comparisons with anyone else's. ${DEFER}`;
  }

  if (OTHER_PARTICIPANT.test(text)) {
    return `I can only discuss your own reviewed card — I don't have access to anyone else's data. ${DEFER}`;
  }

  if (text.includes("who reviewed") || text.includes("who signed") || (text.includes("who") && text.includes("review"))) {
    const gp = card.reviews.find((r) => r.stage === "gp");
    const tcm = card.reviews.find((r) => r.stage === "tcm");
    if (gp && tcm) {
      return `Your card was reviewed and signed off by ${gp.reviewer_name} (${gp.reviewer_credential}) and ${tcm.reviewer_name} (${tcm.reviewer_credential}). ${DISCLAIMER}`;
    }
    return NOT_ON_CARD;
  }

  // Specific biomarker lookup runs before the broad pillar checks so a precise question
  // (e.g. "what's my fasting glucose") gets a precise, grounded answer.
  const biomarkerMatch = findBiomarkerMatch(text, card.biomarkers);
  if (biomarkerMatch) {
    return describeBiomarker(biomarkerMatch);
  }
  if (KNOWN_UNTRACKED_MARKERS.test(text)) {
    return NOT_ON_CARD;
  }

  if (text.includes("metabolic")) {
    const flagged = card.biomarkers.find((b) => b.pillar === "metabolic" && b.flagged);
    const extra = flagged ? ` Your card notes ${flagged.label.toLowerCase()} (${flagged.value} ${flagged.unit}) as one of the areas to monitor.` : "";
    return `${pillarLine(card, "metabolic")}${extra} ${DISCLAIMER}`;
  }

  if (text.includes("vascular") || text.includes("heart") || text.includes("cardio")) {
    return `${pillarLine(card, "vascular")} ${DISCLAIMER}`;
  }

  if (text.includes("mental") || text.includes("cognit") || text.includes("stress") || text.includes("sleep")) {
    return `${pillarLine(card, "mental")} ${DISCLAIMER}`;
  }

  if (text.includes("biological age") || text.includes("bio age") || (text.includes("age") && !text.includes("manage"))) {
    const { biological_age, chronological_age } = card.aiDraft;
    const delta = chronological_age - biological_age;
    return `Your card shows a biological age of ${biological_age}, compared to your chronological age of ${chronological_age} — about ${delta} years younger. ${DISCLAIMER}`;
  }

  if (text.includes("focus") || text.includes("improve") || text.includes("should i") || text.includes("recommend")) {
    const focus = card.aiDraft.suggested_focus.join(", ").toLowerCase();
    return `Your reviewed card highlights ${focus} as focus areas — in plain terms, that's where your care team suggests putting attention. For a specific plan, ${DEFER[0].toLowerCase()}${DEFER.slice(1)} ${DISCLAIMER}`;
  }

  if (text.includes("contributor") || text.includes("why")) {
    const contributor = card.aiDraft.key_contributors[0];
    return `One of the key contributors on your card: "${contributor.text}." ${DISCLAIMER}`;
  }

  const { vascular, metabolic, mental } = card.aiDraft.scores;
  return `Here's what's on your reviewed card: vascular ${vascular}, metabolic ${metabolic}, mental ${mental}, with a biological age of ${card.aiDraft.biological_age}. Ask me about any of these, or your suggested focus areas. ${DISCLAIMER}`;
}
