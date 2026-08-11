import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import {
  computeBiologicalAge,
  computeMissingBiomarkers,
  computeOutOfRange,
  computePillarScores,
} from "../lib/ai/scoring";
import { computePhenoAge } from "../lib/ai/phenoAge";
import type { Biomarker, CarePlan, KeyContributor } from "../lib/types/db";
import { METHODOLOGY_SECTIONS } from "../lib/methodology/content";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

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
science-based longevity platform. This is a wellness programme, not a medical service — never write
anything that reads as a diagnosis, a treatment plan, or a risk factor warning. It should still read
as substantive and specific, not generic filler — this is the core deliverable participants are paying
for, so shallow one-liners are a real failure here.

Use this language:
- "areas to monitor", never "risk factors"
- "suggested discussion points", never "treatment plan"
- Never mention specific medication names, dosages, or conditions/diseases.
- Do not use double quotes for emphasis inside any text field — write around it instead.

Grounding sources you may reference by name (a real guideline body — ADA, AHA, WHO, KDIGO, ACE, etc.)
when explaining why a specific biomarker or category matters:

${SOURCE_GROUNDING}

Rules for using these sources:
- You may name the guideline body itself (e.g. "per ADA guidelines" or "the WHO's classification").
- Never invent a specific study, journal article, author name, or publication year — none of that
  appears above, so none of it should appear in your output either.
- If a biomarker or topic isn't covered by the sources above, write generally without naming a source
  rather than guessing one.

For key_contributors, strengths, and areas_to_monitor: ground each one in a specific captured value —
name the biomarker, its actual value, and briefly explain (one clause, citing the relevant source by
name where you can) what that pattern typically means. "Fasting glucose is elevated" is too thin;
"Fasting glucose sits at 108 mg/dL, above the ADA's normal range of 70-99 mg/dL — sustained levels here
are one of the earliest signals of shifting metabolic health" is the bar. Never invent a value that
isn't in the data given.

Call write_narrative with 5-8 key_contributors, 4-6 strengths, 4-6 suggested_focus items, and 3-5
discussion_points — each a full sentence with real substance, not a 2-3 word label. areas_to_monitor
should only include what the data actually supports (it's fine for this to be short, or empty, if
nothing is genuinely concerning — never pad it with invented concerns).

Also fill in care_plan: 2-4 substantive, imperative, non-prescriptive action items per category, each
explaining briefly why it's being suggested (grounded in the data given, or general science-based
guidance citing a source above where a category has no directly relevant captured data). This will be
reviewed and edited by the participant's doctor before it's shown, so draft it as a strong starting
point, not a final instruction:
- nutrition: diet/weight-related suggestions
- exercise: movement/activity suggestions
- medications: only ever "continue current supplement routine" style or "discuss X with your
  doctor" style — never suggest starting, stopping, or dosing anything
- sleep: sleep habit suggestions
- mindfulness: stress/recovery suggestions`;

// Forcing a tool call instead of asking Claude to free-write a JSON string: the
// API validates/constrains the output to this schema server-side, so there's no
// JSON.parse involved and no way for a stray quote or markdown fence in the
// model's output to break parsing — a whole class of bugs this hit repeatedly.
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
        properties: {
          nutrition: { type: "array", minItems: 2, items: { type: "string" } },
          exercise: { type: "array", minItems: 2, items: { type: "string" } },
          medications: { type: "array", minItems: 2, items: { type: "string" } },
          sleep: { type: "array", minItems: 2, items: { type: "string" } },
          mindfulness: { type: "array", minItems: 2, items: { type: "string" } },
        },
        required: ["nutrition", "exercise", "medications", "sleep", "mindfulness"],
      },
    },
    required: ["key_contributors", "strengths", "areas_to_monitor", "suggested_focus", "discussion_points", "care_plan"],
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const { participantId } = req.body ?? {};
  if (!participantId) {
    res.status(400).json({ error: "participantId is required" });
    return;
  }

  // Scoped to the caller's own session — RLS decides whether they can see this
  // participant's pipeline at all (their own, or a care_team account).
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: pipeline } = await callerClient
    .from("pipeline")
    .select("*")
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!pipeline) {
    res.status(403).json({ error: "Not authorized for this participant" });
    return;
  }
  // Allowed any time before sign-off starts producing a permanent record --
  // this also covers regenerating a draft that was created too early (e.g.
  // before a slow biomarker extraction had finished writing its rows), and
  // "capturing" specifically so a draft can populate progressively as data
  // comes in during onboarding, not just once capture is fully submitted.
  // Safe to call mid-"capturing": the pipeline-state update below is gated on
  // the current state already being "ai_drafted", so calling this here never
  // advances the pipeline early -- it only populates ai_draft.
  const REGENERATABLE_STATES = ["capturing", "ai_drafted", "gp_review", "tcm_review"];
  if (!REGENERATABLE_STATES.includes(pipeline.state)) {
    res.status(409).json({ error: `Cannot generate a draft while pipeline is in state "${pipeline.state}"` });
    return;
  }

  // Writing ai_draft and advancing the pipeline both happen as the system, not
  // the caller — ai_draft is participant-read-only in RLS, so this needs the
  // service-role key.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const [{ data: participant }, { data: biomarkers }] = await Promise.all([
    serviceClient.from("participants").select("*").eq("id", participantId).maybeSingle(),
    serviceClient.from("biomarkers").select("*").eq("participant_id", participantId),
  ]);

  if (!participant) {
    res.status(404).json({ error: "Participant not found" });
    return;
  }

  const rows: Biomarker[] = biomarkers ?? [];
  const scores = computePillarScores(rows);
  // Prefer the real, validated PhenoAge formula (Levine et al. 2018) whenever
  // all 9 of its required biomarkers are on file; otherwise fall back to our
  // own honestly-labeled composite estimate. See lib/ai/phenoAge.ts.
  const biologicalAge = computePhenoAge(rows, participant.age) ?? computeBiologicalAge(scores, participant.age);
  const missingBiomarkers = computeMissingBiomarkers(rows);
  const outOfRange = computeOutOfRange(rows);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  let narrative: {
    key_contributors: KeyContributor[];
    strengths: string[];
    areas_to_monitor: string[];
    suggested_focus: string[];
    discussion_points: string[];
    care_plan: CarePlan;
  };
  try {
    const message = await anthropic.messages.create({
      // Opus, not Sonnet -- this writes the clinical narrative a doctor signs
      // off on, so accuracy outweighs the cost/latency difference. max_tokens
      // covers Opus 5's adaptive thinking (on by default) plus the actual
      // narrative -- thinking and response share one budget, so this has to
      // be well above the old Sonnet-tuned 2500 or the tool call truncates.
      model: "claude-opus-5",
      max_tokens: 8000,
      system: NARRATIVE_PROMPT,
      tools: [NARRATIVE_TOOL],
      tool_choice: { type: "tool", name: "write_narrative" },
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            participant: { age: participant.age, sex: participant.sex, goals: participant.goals },
            scores,
            biological_age: biologicalAge,
            biomarkers: rows.map((b) => ({
              key: b.key,
              label: b.label,
              pillar: b.pillar,
              value: b.value,
              unit: b.unit,
              ref_low: b.ref_low,
              ref_high: b.ref_high,
              flagged: b.flagged,
            })),
            missing_biomarkers: missingBiomarkers,
          }),
        },
      ],
    });
    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      res.status(502).json({ error: "AI did not call the expected tool" });
      return;
    }
    narrative = toolUse.input as typeof narrative;
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "AI draft generation failed" });
    return;
  }

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

  if (draftErr) {
    res.status(500).json({ error: draftErr.message });
    return;
  }

  await serviceClient.from("pipeline").update({ state: "gp_review" }).eq("participant_id", participantId).eq("state", "ai_drafted");

  res.status(200).json({ draft });
}
