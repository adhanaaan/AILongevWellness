import type { SignedCard } from "../data/repository";
import type { Biomarker, PlanCategory } from "../types/db";
import { CARE_PLAN_CATEGORIES_BY_KEY, normalizePlanItem } from "../carePlan/categories";
import { AVA_DISCLAIMER } from "./constants";

const DEFER = "That's a good question for your care team.";
const NOT_ON_CARD = `I don't have that information on your card. ${DEFER}`;

export interface AvaResponse {
  text: string;
  disclaimer?: string;
}

// Heuristic pattern matching for a rule-based mock responder — not real NLU.
// Fires on advice-seeking (diagnosis / dosing / prescribing / symptoms), NOT on
// the bare word "medication" — otherwise the app's own "explain my medications &
// supplements plan" chip trips it and AVA refuses its own deep-link. Real dosing
// questions ("what should I take", "dosage") are still refused below.
const OUT_OF_SCOPE = /diagnos|prescri|dosage|\bdose\b|symptom|disease|treat(ment)?|cure|side ?effect|should i (start|stop|take|change|adjust)|what (medication|drug|med|supplement|pill) should i/i;
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
  return `Your ${b.label.toLowerCase()} is ${b.value} ${b.unit}${rangeNote}.`;
}

// A handful of common lab names not covered by our biomarker set — used only to distinguish
// "asking about a specific marker we don't have" from "asking something more general".
const KNOWN_UNTRACKED_MARKERS = /\bcortisol\b|\btestosterone\b|\bthyroid\b|\btsh\b|\bcreatinine\b|\bferritin\b|\bpotassium\b|\bsodium\b|\bestrogen\b|\bpsa\b/i;

// Maps a care-plan question to one of the five categories. Only consulted once
// the message reads like a "what should I do / what's my plan" question, so a
// plain "how's my sleep score" still routes to the mental pillar instead.
const CARE_PLAN_PATTERNS: Array<{ re: RegExp; key: PlanCategory }> = [
  { re: /nutrition|diet|protein|fibre|fiber|meal|eating|food|hydrat/, key: "nutrition" },
  { re: /exercise|workout|movement|training|walk|zone ?2|strength|vo2/, key: "exercise" },
  { re: /supplement|medication|\bmeds?\b|vitamin|omega|magnesium/, key: "medications" },
  { re: /sleep|recovery|bedtime|rest|circadian/, key: "sleep" },
  { re: /mindful|breathing|meditat|calm|relax|de-?stress|\bstress\b/, key: "mindfulness" },
];

function carePlanLine(card: SignedCard, key: PlanCategory): string {
  const cfg = CARE_PLAN_CATEGORIES_BY_KEY[key];
  const items = card.aiDraft.care_plan?.[key];
  const list = (items && items.length ? items : cfg.starter).map(normalizePlanItem);
  const titles = list.slice(0, 3).map((i) => i.title.toLowerCase()).join("; ");
  return `On your ${cfg.label.toLowerCase()} plan, your care team suggests: ${titles}. Open the Care Plan tab for the full detail.`;
}

export function respondAsAva(message: string, card: SignedCard): AvaResponse {
  const text = message.toLowerCase();

  if (OUT_OF_SCOPE.test(text)) {
    return { text: `I can only talk through what's on your reviewed wellness card — I'm not able to help with diagnoses, medications, or symptoms. ${DEFER}` };
  }

  if (COMPARISON.test(text)) {
    return { text: `I can only discuss your own reviewed card, not comparisons with anyone else's. ${DEFER}` };
  }

  if (OTHER_PARTICIPANT.test(text)) {
    return { text: `I can only discuss your own reviewed card — I don't have access to anyone else's data. ${DEFER}` };
  }

  if (text.includes("who reviewed") || text.includes("who signed") || (text.includes("who") && text.includes("review"))) {
    const gp = card.reviews.find((r) => r.stage === "gp");
    const tcm = card.reviews.find((r) => r.stage === "tcm");
    if (gp && tcm) {
      return {
        text: `Your card was reviewed and signed off by ${gp.reviewer_name} (${gp.reviewer_credential}) and ${tcm.reviewer_name} (${tcm.reviewer_credential}).`,
        disclaimer: AVA_DISCLAIMER,
      };
    }
    return { text: NOT_ON_CARD };
  }

  // Specific biomarker lookup runs before the broad pillar checks so a precise question
  // (e.g. "what's my fasting glucose") gets a precise, grounded answer.
  const biomarkerMatch = findBiomarkerMatch(text, card.biomarkers);
  if (biomarkerMatch) {
    return { text: describeBiomarker(biomarkerMatch), disclaimer: AVA_DISCLAIMER };
  }
  if (KNOWN_UNTRACKED_MARKERS.test(text)) {
    return { text: NOT_ON_CARD };
  }

  // Care-plan questions. Triggered when the message reads like "what's my plan"
  // or names a plan-only track (nutrition/exercise/supplements) that has no pillar
  // of its own — sleep/stress alone still route to the mental pillar below.
  const wantsPlan =
    text.includes("plan") ||
    /nutrition|diet|supplement|medication|\bmeds?\b|vitamin|omega|exercise|workout/.test(text);
  if (wantsPlan) {
    const match = CARE_PLAN_PATTERNS.find((p) => p.re.test(text));
    if (match) {
      return { text: carePlanLine(card, match.key), disclaimer: AVA_DISCLAIMER };
    }
  }

  if (text.includes("metabolic")) {
    const flagged = card.biomarkers.find((b) => b.pillar === "metabolic" && b.flagged);
    const extra = flagged ? ` Your card notes ${flagged.label.toLowerCase()} (${flagged.value} ${flagged.unit}) as one of the areas to monitor.` : "";
    return { text: `${pillarLine(card, "metabolic")}${extra}`, disclaimer: AVA_DISCLAIMER };
  }

  if (text.includes("vascular") || text.includes("heart") || text.includes("cardio")) {
    return { text: pillarLine(card, "vascular"), disclaimer: AVA_DISCLAIMER };
  }

  if (text.includes("mental") || text.includes("cognit") || text.includes("stress") || text.includes("sleep")) {
    return { text: pillarLine(card, "mental"), disclaimer: AVA_DISCLAIMER };
  }

  if (text.includes("biological age") || text.includes("bio age") || (text.includes("age") && !text.includes("manage"))) {
    const { biological_age, chronological_age } = card.aiDraft;
    const delta = chronological_age - biological_age;
    return {
      text: `Your card shows a biological age of ${biological_age}, compared to your chronological age of ${chronological_age} — about ${delta} years younger.`,
      disclaimer: AVA_DISCLAIMER,
    };
  }

  if (text.includes("focus") || text.includes("improve") || text.includes("should i") || text.includes("recommend") || text.includes("priorit")) {
    const focusAreas = card.aiDraft.suggested_focus;
    const top = focusAreas[0];
    const rest = focusAreas.slice(1).join(", ").toLowerCase();
    if (top) {
      const more = rest ? ` Your card also flags ${rest}.` : "";
      return {
        text: `The first area your care team suggests focusing on is ${top.toLowerCase()}.${more} A good first step is to open your Care Plan tab and start with one small, repeatable change there.`,
        disclaimer: AVA_DISCLAIMER,
      };
    }
  }

  if (text.includes("contributor") || text.includes("why")) {
    const contributor = card.aiDraft.key_contributors[0];
    if (contributor) {
      return { text: `One of the key contributors on your card: "${contributor.text}."`, disclaimer: AVA_DISCLAIMER };
    }
  }

  const { vascular, metabolic, mental } = card.aiDraft.scores;
  return {
    text: `Here's what's on your reviewed card: vascular ${vascular}, metabolic ${metabolic}, mental ${mental}, with a biological age of ${card.aiDraft.biological_age}. Ask me about any of these, or your suggested focus areas.`,
    disclaimer: AVA_DISCLAIMER,
  };
}
