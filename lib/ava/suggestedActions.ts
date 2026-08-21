// Turn an AVA answer into tappable next-steps: after AVA responds, we scan the
// participant's question and AVA's reply for the things this app actually has a
// screen for (a pillar, biological age, a care-plan category, the methodology
// page) and surface a chip that deep-links straight there. This closes the loop
// the other way from useAskAva — app → AVA → back into the app — so an answer is
// a jumping-off point, not a dead end. Pure string matching, no API dependency.

export interface AvaAction {
  label: string;
  route: string;
}

interface Rule {
  pattern: RegExp;
  action: AvaAction;
}

// Order is priority: the most specific/actionable topics first, since the final
// list is deduped by route and capped. Patterns are intentionally generous with
// synonyms so an answer reliably surfaces the right screen.
const RULES: Rule[] = [
  { pattern: /biological age|bio.?age|phenoage|younger than|older than|aging|ageing/i, action: { label: "Biological age", route: "/bio-age" } },
  { pattern: /vascular|heart|blood pressure|\bbp\b|cholesterol|ldl|hdl|cardio|circulat|artery|arterial/i, action: { label: "View vascular", route: "/pillar/vascular" } },
  { pattern: /metabolic|glucose|blood sugar|insulin|a1c|hba1c|triglyceride|waist|\bbmi\b|body fat|visceral/i, action: { label: "View metabolic", route: "/pillar/metabolic" } },
  { pattern: /mental|cognitive|brain|mood|stress|reaction time|hrv|resilien|burnout/i, action: { label: "View mental", route: "/pillar/mental" } },
  { pattern: /supplement|medication|\bmeds?\b|omega|vitamin|magnesium|fish oil|adherence/i, action: { label: "Medications plan", route: "/care-plan/medications" } },
  { pattern: /sleep|recovery|bedtime|\brest\b|circadian|wind ?down/i, action: { label: "Sleep plan", route: "/care-plan/sleep" } },
  { pattern: /nutrition|diet|protein|fibre|fiber|meal|eating|\bfood\b|hydrat/i, action: { label: "Nutrition plan", route: "/care-plan/nutrition" } },
  { pattern: /exercise|zone ?2|workout|movement|\bwalk\b|training|vo2|strength|cardio fitness/i, action: { label: "Exercise plan", route: "/care-plan/exercise" } },
  { pattern: /mindful|breathing|meditat|calm|relax|de-?stress/i, action: { label: "Mindfulness plan", route: "/care-plan/mindfulness" } },
  { pattern: /methodolog|how.*(calculat|measur|scored?|work out)|reference range|\bsource\b|citation|guideline|evidence/i, action: { label: "How this is measured", route: "/methodology" } },
];

const MAX_ACTIONS = 3;

/**
 * Derive up to {@link MAX_ACTIONS} deep-link chips from a Q&A exchange. Matches
 * against both the question and the reply so a chip appears whether the topic
 * came from the participant ("tell me about my vascular score") or was raised in
 * AVA's answer. Deduped by route, capped so the answer never grows a wall of chips.
 */
export function suggestedActions(question: string, reply: string): AvaAction[] {
  const haystack = `${question}\n${reply}`;
  const seen = new Set<string>();
  const actions: AvaAction[] = [];
  for (const { pattern, action } of RULES) {
    if (actions.length >= MAX_ACTIONS) break;
    if (seen.has(action.route)) continue;
    if (pattern.test(haystack)) {
      seen.add(action.route);
      actions.push(action);
    }
  }
  return actions;
}
