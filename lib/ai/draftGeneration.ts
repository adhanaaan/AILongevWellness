import type { SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import {
  computeBiologicalAge,
  computeMissingBiomarkers,
  computeOutOfRange,
  computePillarScores,
} from "./scoring";
import { computePhenoAge } from "./phenoAge";
import type { AiDraft, Biomarker, CarePlan, KeyContributor } from "../types/db";
import { METHODOLOGY_SECTIONS } from "../methodology/content";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

// Regeneration is allowed any time before sign-off starts producing a permanent
// record: this covers regenerating a draft created too early (e.g. before a slow
// biomarker extraction finished writing), and "capturing" so a draft can
// populate progressively during onboarding. Never regenerate a signed/delivered
// card's narrative.
export const REGENERATABLE_STATES = ["capturing", "ai_drafted", "gp_review", "tcm_review"];

// Reuses the same human-verified source content shown on the app's own
// Methodology & Sources page (lib/methodology/content.ts) as grounding, so the
// model can name a real guideline body (ADA, AHA, KDIGO, WHO, etc.) when
// explaining why a biomarker matters, without ever inventing a specific paper,
// author, or year -- letting an LLM freely generate citations per participant
// is exactly the kind of thing that produces confident, plausible-sounding
// fabrications, and this is a science-positioned product where that's a real
// credibility risk, not just a nice-to-have to avoid.
const SOURCE_GROUNDING = METHODOLOGY_SECTIONS.filter(
  (s) => s.title !== "How your scores are calculated" && s.title !== "A note on all of this"
)
  .map((s) => `${s.title}: ${s.paragraphs.join(" ")}`)
  .join("\n\n");

const NARRATIVE_PROMPT = `You are writing the narrative sections of an executive wellness card for a
science-based longevity platform. The person reading this pays a premium for genuine insight into their
own body — so every line must feel written FOR THEM, derived from THEIR actual numbers, goals and life,
not assembled from generic wellness advice. Shallow, interchangeable, one-size-fits-all bullets are the
single biggest failure here: if a sentence could be pasted unchanged into any other person's report, it
does not belong in this one.

This is a wellness programme, not a medical service — never write anything that reads as a diagnosis, a
treatment plan, or a risk-factor warning.

Language rules:
- "areas to monitor", never "risk factors"
- "suggested discussion points", never "treatment plan"
- Say "you" / "participant"; never "patient".
- Never name a specific medication, a dosage, or a named disease/condition.
- Do not use double quotes for emphasis inside any text field — write around it instead.

Voice: warm, plain, direct executive English, addressed to the participant as "you". Respect a smart,
time-poor reader — no hedging filler, no unexplained jargon, no false alarm. Confident and human.

PERSONALISE EVERYTHING. You are given this participant's age, sex, stated wellness goals, lifestyle
inputs (exercise frequency, alcohol, smoking), current self-reported supplements, and every captured
biomarker with its value and reference range. Use all of it:
- Anchor every insight in a SPECIFIC captured value — name the biomarker, its actual number and unit,
  and how it sits relative to its reference range.
- Tie insights to THIS person's stated goals wherever the data speaks to them. If a goal is longevity
  and a metabolic marker is drifting, spell out how the two connect for them specifically.
- Factor in age and sex when saying what a value means (sex-specific ranges; what counts as strong
  "for your age").
- Reflect their lifestyle and supplement inputs — credit what they are already doing well, and call out
  where a habit and a biomarker line up (well or poorly).
- Show how the three systems INTERRELATE. Vascular, metabolic and mental are not independent — name the
  connections THIS person's data actually shows (e.g. how central-fat distribution and glucose travel
  together, or how their sleep is underwriting their cognition). This cross-system reasoning is a large
  part of what makes the report worth its price; do not skip it.

"WHAT THIS MEANS FOR YOU." Every key contributor, strength and focus area must do two things at once:
state the finding with its real value, AND explain the so-what — why it matters for this person and what
it protects, enables, or points toward. A number with no meaning is worthless; a meaning with no number
is generic. Always give both. "Fasting glucose is elevated" is too thin; "Fasting glucose sits at
108 mg/dL, above the ADA's normal range of 70-99 mg/dL — sustained levels here are one of the earliest
signals of shifting metabolic health, and given your longevity goal it is the highest-value number to
move" is the bar.

Grounding sources you may reference by name (a real guideline body — ADA, AHA, WHO, KDIGO, ACE, etc.)
when explaining why a specific biomarker or category matters:

${SOURCE_GROUNDING}

Rules for using these sources:
- You may name the guideline body itself (e.g. "per ADA guidelines" or "the WHO's classification").
- Never invent a specific study, journal article, author name, or publication year — none of that
  appears above, so none of it should appear in your output either.
- If a biomarker or topic isn't covered by the sources above, write generally without naming a source
  rather than guessing one.
- Never invent a value that isn't in the data you are given.

Call write_narrative with:
- key_contributors (5-8): the heart of the report. Each a full, specific sentence naming a real value
  and what it means for this person. Use tone "monitor" for something drifting, "good" for a genuine
  strength. Lead with what matters most; include at least one that connects two pillars.
- strengths (4-6): what is genuinely working — each anchored to a real value and why it is protective
  FOR THEM, not vague praise.
- areas_to_monitor: only what the data actually supports, each naming the value and why it is worth
  watching. Short or empty is fine — never invent a concern to fill the list.
- suggested_focus (4-6): the highest-leverage things for THIS person to put attention on, ORDERED
  most-impactful first, each explaining the why and tied to their values and goals. Focus areas, not a
  treatment plan.
- discussion_points (3-5): precise, high-value questions this person can bring to their care team — the
  specific things worth a professional's time given their exact data, not generic check-in prompts.
- care_plan: 2-4 SHORT, scannable actions per category, ORDERED highest-leverage first — a checklist a
  busy executive reads in seconds. The depth and the specific values live in the sections above; the
  care plan turns them into crisp actions. Each item has TWO parts:
  - title: imperative headline, ~3-7 words, no trailing period (e.g. "Shift caffeine earlier", "Protect
    your strong lipid profile"). Under ~50 characters.
  - detail: ONE supporting line, ~8-16 words — the reason or the specifics. Do NOT recite raw biomarker
    values/units here (no "triglycerides of 0.66 mmol/L" — that belongs in the sections above). Under
    ~120 characters.
  Think premium protocol cards (Superpower/Withings): a bold action, one line of why. Categories:
  - nutrition: diet/weight-related suggestions
  - exercise: movement/activity suggestions
  - medications: only ever "continue current supplement routine" style or "discuss X with your doctor"
    style — never suggest starting, stopping, or dosing anything
  - sleep: sleep habit suggestions
  - mindfulness: stress/recovery suggestions

This whole draft is reviewed and edited by the participant's doctor before it is ever shown, so make it
a strong, specific, personal starting point — never a final instruction.`;

// Forcing a tool call instead of asking Claude to free-write a JSON string: the
// API validates/constrains the output to this schema server-side, so there's no
// JSON.parse involved and no way for a stray quote or markdown fence in the
// model's output to break parsing — a whole class of bugs this hit repeatedly.
// One care-plan action: a short imperative title + a one-line detail.
const PLAN_ITEM_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", maxLength: 60 },
    detail: { type: "string", maxLength: 140 },
  },
  required: ["title", "detail"],
};

const NARRATIVE_TOOL: Anthropic.Tool = {
  name: "write_narrative",
  description: "Write the narrative sections of the wellness card.",
  input_schema: {
    type: "object",
    properties: {
      key_contributors: {
        type: "array",
        minItems: 5,
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            tone: { type: "string", enum: ["good", "monitor"] },
          },
          required: ["text", "tone"],
        },
      },
      strengths: { type: "array", minItems: 4, items: { type: "string" } },
      // No minItems -- forcing a minimum here would pressure the model to
      // invent concerns the data doesn't actually support.
      areas_to_monitor: { type: "array", items: { type: "string" } },
      suggested_focus: { type: "array", minItems: 4, items: { type: "string" } },
      discussion_points: { type: "array", minItems: 3, items: { type: "string" } },
      care_plan: {
        type: "object",
        // Each item is {title, detail}. maxLength on both is a hard guardrail
        // against the model writing paragraph-length plan items — the plan must
        // stay a scannable checklist. The depth lives in key_contributors /
        // discussion_points, which have no such cap.
        properties: {
          nutrition: { type: "array", minItems: 2, items: PLAN_ITEM_SCHEMA },
          exercise: { type: "array", minItems: 2, items: PLAN_ITEM_SCHEMA },
          medications: { type: "array", minItems: 2, items: PLAN_ITEM_SCHEMA },
          sleep: { type: "array", minItems: 2, items: PLAN_ITEM_SCHEMA },
          mindfulness: { type: "array", minItems: 2, items: PLAN_ITEM_SCHEMA },
        },
        required: ["nutrition", "exercise", "medications", "sleep", "mindfulness"],
      },
    },
    required: ["key_contributors", "strengths", "areas_to_monitor", "suggested_focus", "discussion_points", "care_plan"],
  },
};

interface Narrative {
  key_contributors: KeyContributor[];
  strengths: string[];
  areas_to_monitor: string[];
  suggested_focus: string[];
  discussion_points: string[];
  care_plan: CarePlan;
}

// The participant profile the model gets alongside the biomarkers. Passing the
// lifestyle inputs, current supplements, and body metrics (not just age/sex/goals)
// is what lets the narrative credit what the participant is already doing and tie
// insights to how they actually live -- the difference between a personal report
// and a generic one. All of these already live on the participants row.
function participantContext(p: {
  age: number;
  sex: string;
  goals: string[] | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  exercise_frequency?: string | null;
  smoking?: boolean | null;
  alcohol_drinks_per_week?: string | null;
  medications?: string[] | null;
}) {
  return {
    age: p.age,
    sex: p.sex,
    goals: p.goals ?? [],
    height_cm: p.height_cm ?? null,
    weight_kg: p.weight_kg ?? null,
    exercise_frequency: p.exercise_frequency ?? null,
    smoking: p.smoking ?? null,
    alcohol_drinks_per_week: p.alcohol_drinks_per_week ?? null,
    current_supplements: p.medications ?? [],
  };
}

// The biomarker shape the model sees -- one place so both the full regeneration
// and the care-plan backfill send identical fields.
function biomarkerContext(rows: Biomarker[]) {
  return rows.map((b) => ({
    key: b.key,
    label: b.label,
    pillar: b.pillar,
    value: b.value,
    unit: b.unit,
    ref_low: b.ref_low,
    ref_high: b.ref_high,
    flagged: b.flagged,
  }));
}

export type RegenerateResult =
  | { status: "ok"; draft: AiDraft }
  | { status: "skipped"; reason: "not_regeneratable" | "no_participant" };

/**
 * The full AI-draft (re)generation, shared by the generate-draft HTTP endpoint
 * and every server-side biomarker-writing path (extraction + ReCOGnAIze). Runs
 * the whole thing -- deterministic scores/bio age/missing/out-of-range AND the
 * Opus-written narrative + care plan -- and upserts the complete draft, so a data
 * change re-derives *everything*, not just the numbers.
 *
 * Callers must have already authorized access; this uses the passed service-role
 * client and does no RLS check of its own. Gated to REGENERATABLE_STATES so a
 * signed/delivered card is never regenerated. Advances capturing/ai_drafted ->
 * gp_review exactly as before (the state guard on the pipeline update means an
 * onboarding "capturing" call never advances early).
 */
export async function regenerateDraft(
  serviceClient: SupabaseClient,
  participantId: string
): Promise<RegenerateResult> {
  const { data: pipeline } = await serviceClient
    .from("pipeline")
    .select("state")
    .eq("participant_id", participantId)
    .maybeSingle();
  if (!pipeline || !REGENERATABLE_STATES.includes(pipeline.state)) {
    return { status: "skipped", reason: "not_regeneratable" };
  }

  // Under async GP/TCM review the state stays "gp_review" after the first
  // signature, so REGENERATABLE_STATES alone isn't enough: regenerating now would
  // silently rewrite scores + narrative a reviewer has already signed. Skip once
  // either stage has signed (a late biomarker write instead raises needs_attention
  // via flagIfPastSignoff, so the care team re-reviews).
  const { data: signedReviews } = await serviceClient
    .from("reviews")
    .select("signed_at")
    .eq("participant_id", participantId)
    .not("signed_at", "is", null)
    .limit(1);
  if (signedReviews && signedReviews.length > 0) {
    return { status: "skipped", reason: "not_regeneratable" };
  }

  const [{ data: participant }, { data: biomarkers }] = await Promise.all([
    serviceClient.from("participants").select("*").eq("id", participantId).maybeSingle(),
    serviceClient.from("biomarkers").select("*").eq("participant_id", participantId),
  ]);
  if (!participant) return { status: "skipped", reason: "no_participant" };

  const rows: Biomarker[] = biomarkers ?? [];
  const scores = computePillarScores(rows);
  // Prefer the real, validated PhenoAge formula (Levine et al. 2018) whenever
  // all 9 of its required biomarkers are on file; otherwise fall back to our
  // own honestly-labeled composite estimate. See lib/ai/phenoAge.ts.
  const biologicalAge = computePhenoAge(rows, participant.age) ?? computeBiologicalAge(scores, participant.age);
  const missingBiomarkers = computeMissingBiomarkers(rows);
  const outOfRange = computeOutOfRange(rows);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    // Opus, not Sonnet -- this writes the clinical narrative a doctor signs off
    // on, so accuracy outweighs the cost/latency difference. max_tokens covers
    // Opus 5's adaptive thinking (on by default) plus the actual narrative --
    // thinking and response share one budget.
    model: "claude-opus-5",
    max_tokens: 8000,
    system: NARRATIVE_PROMPT,
    tools: [NARRATIVE_TOOL],
    tool_choice: { type: "tool", name: "write_narrative" },
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          participant: participantContext(participant),
          scores,
          biological_age: biologicalAge,
          chronological_age: participant.age,
          biomarkers: biomarkerContext(rows),
          missing_biomarkers: missingBiomarkers,
        }),
      },
    ],
  });
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) throw new Error("AI did not call the expected tool");
  const narrative = toolUse.input as Narrative;

  const { data: draft, error: draftErr } = await serviceClient
    .from("ai_draft")
    .upsert(
      {
        participant_id: participantId,
        scores,
        biological_age: biologicalAge,
        chronological_age: participant.age,
        key_contributors: narrative.key_contributors ?? [],
        strengths: narrative.strengths ?? [],
        areas_to_monitor: narrative.areas_to_monitor ?? [],
        suggested_focus: narrative.suggested_focus ?? [],
        discussion_points: narrative.discussion_points ?? [],
        care_plan: narrative.care_plan ?? null,
        missing_biomarkers: missingBiomarkers,
        out_of_range: outOfRange,
        generated_at: new Date().toISOString(),
        edited_by_admin: false,
      },
      { onConflict: "participant_id" }
    )
    .select()
    .single();
  if (draftErr) throw new Error(draftErr.message);

  await serviceClient
    .from("pipeline")
    .update({ state: "gp_review" })
    .eq("participant_id", participantId)
    .eq("state", "ai_drafted");

  return { status: "ok", draft };
}

export type BackfillResult =
  | { status: "ok"; draft: AiDraft }
  | { status: "skipped"; reason: "no_draft" | "already_has_plan" };

/**
 * Backfill ONLY the care_plan onto an existing draft, without touching the
 * signed assessment (scores, biological age, narrative) or the pipeline state.
 *
 * This exists for one specific case: a card that was signed off and delivered
 * *before* the care-plan feature existed, so it has a doctor-reviewed assessment
 * but an empty care_plan. Regenerating the whole draft is forbidden on a
 * delivered card (it would rewrite what the doctors signed) — but the care plan
 * was never part of that sign-off, so generating just that section and leaving
 * everything else intact is safe. It's surfaced to the participant as an
 * AI-drafted plan "pending review" (never as reviewed) — the caller distinguishes
 * it by generated_at moving past the sign-off time. Only ever fills an ABSENT
 * plan; it will not overwrite a care_plan that already exists (e.g. a reviewed one).
 */
export async function backfillCarePlan(
  serviceClient: SupabaseClient,
  participantId: string
): Promise<BackfillResult> {
  const [{ data: participant }, { data: biomarkers }, { data: existingDraft }, { data: reviews }] =
    await Promise.all([
      serviceClient.from("participants").select("*").eq("id", participantId).maybeSingle(),
      serviceClient.from("biomarkers").select("*").eq("participant_id", participantId),
      serviceClient.from("ai_draft").select("*").eq("participant_id", participantId).maybeSingle(),
      serviceClient.from("reviews").select("signed_at").eq("participant_id", participantId),
    ]);
  if (!participant || !existingDraft) return { status: "skipped", reason: "no_draft" };
  // Protect only a plan that was part of the sign-off (reviewed) — generated at or
  // before the latest signature. A plan generated AFTER sign-off is a prior pending
  // backfill and MAY be regenerated (e.g. to pick up a better prompt), since it was
  // never reviewed anyway.
  const existingPlan = existingDraft.care_plan;
  if (existingPlan && Object.keys(existingPlan).length > 0) {
    const latestSignedAt = (reviews ?? []).reduce(
      (max: number, r: { signed_at: string | null }) =>
        r.signed_at ? Math.max(max, Date.parse(r.signed_at)) : max,
      0
    );
    const genAt = existingDraft.generated_at ? Date.parse(existingDraft.generated_at) : 0;
    if (genAt <= latestSignedAt) {
      return { status: "skipped", reason: "already_has_plan" };
    }
  }

  const rows: Biomarker[] = biomarkers ?? [];

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: NARRATIVE_PROMPT,
    tools: [NARRATIVE_TOOL],
    tool_choice: { type: "tool", name: "write_narrative" },
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          // Ground the plan in the card's own signed values, not a fresh
          // recompute — we're filling a gap in this delivered card, not redoing it.
          participant: participantContext(participant),
          scores: existingDraft.scores,
          biological_age: existingDraft.biological_age,
          chronological_age: participant.age,
          biomarkers: biomarkerContext(rows),
          missing_biomarkers: existingDraft.missing_biomarkers ?? [],
        }),
      },
    ],
  });
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) throw new Error("AI did not call the expected tool");
  const narrative = toolUse.input as Narrative;

  // Persist ONLY the care plan (and generated_at, so the caller can tell this
  // plan post-dates the sign-off and mark it "pending review"). Everything the
  // doctors signed — scores, biological age, contributors, focus — is untouched.
  const { data: draft, error: draftErr } = await serviceClient
    .from("ai_draft")
    .update({
      care_plan: narrative.care_plan,
      generated_at: new Date().toISOString(),
    })
    .eq("participant_id", participantId)
    .select()
    .single();
  if (draftErr) throw new Error(draftErr.message);

  return { status: "ok", draft };
}
