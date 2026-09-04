// Contextual follow-up questions shown as tappable chips under the latest AVA
// answer, so the conversation keeps moving instead of dead-ending. We scan the
// exchange (the question + AVA's reply) for the topic in play and offer 2-3
// natural next questions, then top up with a card-derived nudge toward a pillar
// the participant hasn't asked about yet. Pure string matching + card
// derivation, so it behaves the same in the real (Supabase) and mock paths.

import type { SignedCard } from "../data/repository";
import type { Pillar } from "../types/db";

interface FollowUpRule {
  pattern: RegExp;
  followUps: string[];
}

// First matching rule wins its questions; we keep scanning others until we have
// enough. Order is by specificity so the most relevant follow-ups come first.
const RULES: FollowUpRule[] = [
  {
    pattern: /biological age|bio.?age|phenoage|younger|older/i,
    followUps: ["What's driving my biological age?", "How can I lower it further?"],
  },
  {
    pattern: /vascular|heart|blood pressure|cholesterol|cardio|hrv/i,
    followUps: ["What can I do to improve my vascular health?", "Which markers drive my vascular score?"],
  },
  {
    pattern: /metabolic|glucose|blood sugar|insulin|a1c|hba1c|triglyceride|waist|bmi|body fat/i,
    followUps: ["How can I improve my metabolic health?", "Which foods would help most?"],
  },
  {
    pattern: /mental|cognitive|brain|mood|stress|sleep|reaction time/i,
    followUps: ["How can I support my mental score?", "What helps most with stress and sleep?"],
  },
  {
    pattern: /nutrition|diet|protein|meal|eating|food/i,
    followUps: ["How do I get started this week?", "Why is this recommended for me?"],
  },
  {
    pattern: /exercise|zone 2|workout|movement|training|vo2|walk/i,
    followUps: ["What's a realistic weekly routine?", "How much is enough?"],
  },
  {
    pattern: /supplement|medication|vitamin|omega|magnesium/i,
    followUps: ["Should I raise this with my care team?", "How do I track what I take?"],
  },
  {
    pattern: /mindful|breathing|meditat|calm|relax/i,
    followUps: ["What's a simple daily practice?", "How long does it take to help?"],
  },
  {
    pattern: /focus|improve|priorit|should i|recommend/i,
    followUps: ["What's the single most important step?", "How long until I'd see a change?"],
  },
];

const MAX_FOLLOWUPS = 3;

/**
 * Derive up to {@link MAX_FOLLOWUPS} contextual follow-up questions from a Q&A
 * exchange, never repeating the question just asked. Tops up from the card's
 * pillar scores so there's always at least one relevant next question.
 */
export function followUpQuestions(question: string, reply: string, card: SignedCard): string[] {
  const haystack = `${question}\n${reply}`;
  const askedNorm = normalize(question);
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (q: string) => {
    const key = normalize(q);
    if (key === askedNorm || seen.has(key)) return;
    seen.add(key);
    out.push(q);
  };

  for (const { pattern, followUps } of RULES) {
    if (out.length >= MAX_FOLLOWUPS) break;
    if (pattern.test(haystack)) {
      for (const f of followUps) {
        if (out.length >= MAX_FOLLOWUPS) break;
        push(f);
      }
    }
  }

  // Backfill: nudge toward the participant's lowest pillar not yet in play.
  if (out.length < MAX_FOLLOWUPS) {
    const scores = card.aiDraft.scores;
    const pillars = (Object.keys(scores) as Pillar[]).sort((a, b) => scores[a] - scores[b]);
    const lowerHaystack = haystack.toLowerCase();
    for (const p of pillars) {
      if (out.length >= MAX_FOLLOWUPS) break;
      if (lowerHaystack.includes(p) || !Number.isFinite(scores[p])) continue;
      push(`What does my ${p} score of ${scores[p]} mean?`);
    }
  }

  return out.slice(0, MAX_FOLLOWUPS);
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[?.!]+$/, "");
}
