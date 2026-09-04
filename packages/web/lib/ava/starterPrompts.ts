// Personalized opening prompts for the AVA chat. Instead of a static "try
// asking" list, we derive 3-4 smart starter questions from the participant's OWN
// data (their lowest pillar, a flagged marker, their biological age, their top
// focus, their care plan) so the very first thing they can tap is specific to
// them. Pure derivation from the card — no API dependency, so it works
// identically in the real (Supabase) and mock paths.

import type { SignedCard } from "../data/repository";
import type { Pillar, PlanCategory } from "../types/db";
import { CARE_PLAN_CATEGORIES_BY_KEY } from "../carePlan/categories";

const PILLAR_LABELS: Record<Pillar, string> = {
  vascular: "vascular",
  metabolic: "metabolic",
  mental: "mental",
};

const MAX_STARTERS = 4;

// Safe generics used only to top up a sparse card (early draft with little data).
const FALLBACKS = [
  "What should I focus on first?",
  "Tell me about my biological age",
  "How can I improve my sleep?",
  "What are my strengths?",
];

/**
 * Up to {@link MAX_STARTERS} personalized opening questions, ordered by what's
 * most worth the participant's attention. De-duped, and topped up with generic
 * fallbacks if the card is too sparse to produce enough personalized ones.
 */
export function starterPrompts(card: SignedCard): string[] {
  const { aiDraft, biomarkers } = card;
  const prompts: string[] = [];

  // 1. Lowest pillar score — the thing most worth attention first.
  const scores = aiDraft.scores;
  const pillars = (Object.keys(scores) as Pillar[]).sort((a, b) => scores[a] - scores[b]);
  const lowest = pillars[0];
  if (lowest != null && Number.isFinite(scores[lowest])) {
    prompts.push(`How can I improve my ${PILLAR_LABELS[lowest]} score of ${scores[lowest]}?`);
  }

  // 2. A flagged biomarker, if any — the most concrete, specific hook.
  const flagged = biomarkers.find((b) => b.flagged && b.value != null);
  if (flagged) {
    prompts.push(`What does my ${flagged.label.toLowerCase()} of ${flagged.value} ${flagged.unit} mean?`);
  }

  // 3. Biological age.
  if (Number.isFinite(aiDraft.biological_age) && Number.isFinite(aiDraft.chronological_age)) {
    const delta = aiDraft.chronological_age - aiDraft.biological_age;
    prompts.push(delta >= 0 ? "How can I keep lowering my biological age?" : "What's driving my biological age?");
  }

  // 4. Top suggested focus area.
  const focus = aiDraft.suggested_focus?.[0];
  if (focus) {
    prompts.push(`What's the best first step on ${focus.toLowerCase()}?`);
  }

  // 5. Care plan, if one exists.
  const carePlan = aiDraft.care_plan;
  if (carePlan) {
    const withItems = (Object.keys(carePlan) as PlanCategory[]).find((k) => carePlan[k]?.length);
    if (withItems) {
      prompts.push(`What's on my ${CARE_PLAN_CATEGORIES_BY_KEY[withItems].label.toLowerCase()} plan?`);
    }
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of [...prompts, ...FALLBACKS]) {
    if (out.length >= MAX_STARTERS) break;
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/**
 * A personalized opening greeting for the chat, referencing the participant's
 * biological age when we have it. Behaves identically in mock and real mode.
 */
export function avaGreeting(card: SignedCard, reviewed: boolean): string {
  const bio = card.aiDraft.biological_age;
  const bioClause = Number.isFinite(bio) ? ` your biological age of ${bio},` : "";
  if (reviewed) {
    return `Your wellness card has been reviewed and signed off by your care team. I can walk you through your pillar scores,${bioClause} or your focus areas — where would you like to start?`;
  }
  return `Here are your early results — they're still being reviewed by your care team, so a few numbers may change. I can walk you through your pillar scores,${bioClause} or where to focus first. What would you like to know?`;
}
