import type { SignedCard } from "@/lib/data/repository";

const DISCLAIMER = "This is general wellness information, not medical advice.";
const DEFER = "That's a good question for your care team.";

const OUT_OF_SCOPE = /diagnos|medicat|prescri|drug|dosage|symptom|disease|treat(ment)?|cure/i;

function pillarLine(card: SignedCard, pillar: "vascular" | "metabolic" | "mental") {
  const score = card.aiDraft.scores[pillar];
  const status = score >= 70 ? "in a good range" : "an area your card flags to monitor";
  return `Your ${pillar} score on your reviewed card is ${score}, which is ${status}.`;
}

/**
 * Canned, rule-based responder — AVA's context is strictly the participant's own
 * delivered ai_draft + biomarkers (passed in as `card`). It never invents a number
 * that isn't on the card, and it never proposes new protocols/dosages/durations.
 */
export function respondAsAva(message: string, card: SignedCard): string {
  const text = message.toLowerCase();

  if (OUT_OF_SCOPE.test(text)) {
    return `I can only talk through what's on your reviewed wellness card — I'm not able to help with diagnoses, medications, or symptoms. ${DEFER}`;
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
    return `Your reviewed card highlights ${focus} as focus areas — in plain terms, that's where your care team suggests putting attention. ${DEFER} for a specific plan. ${DISCLAIMER}`;
  }

  if (text.includes("contributor") || text.includes("why")) {
    const contributor = card.aiDraft.key_contributors[0];
    return `One of the key contributors on your card: "${contributor.text}." ${DISCLAIMER}`;
  }

  const { vascular, metabolic, mental } = card.aiDraft.scores;
  return `Here's what's on your reviewed card: vascular ${vascular}, metabolic ${metabolic}, mental ${mental}, with a biological age of ${card.aiDraft.biological_age}. Ask me about any of these, or your suggested focus areas. ${DISCLAIMER}`;
}
