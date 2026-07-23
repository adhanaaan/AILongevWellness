import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import {
  computeBiologicalAge,
  computeMissingBiomarkers,
  computeOutOfRange,
  computePillarScores,
} from "../lib/ai/scoring";
import { parseJsonResponse } from "../lib/ai/parseJson";
import { extractText } from "../lib/ai/extractText";
import type { Biomarker, KeyContributor } from "../lib/types/db";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const NARRATIVE_PROMPT = `You are writing the narrative sections of an executive wellness card. This is a
wellness programme, not a medical service — never write anything that reads as a diagnosis,
a treatment plan, or a risk factor warning.

Use this language:
- "areas to monitor", never "risk factors"
- "suggested discussion points", never "treatment plan"
- Never mention medications, dosages, or specific conditions/diseases.

Reply with ONLY a JSON object, no prose, no markdown fences, in exactly this shape:
{
  "key_contributors": [{"text": "...", "tone": "good"}, {"text": "...", "tone": "monitor"}],
  "strengths": ["...", "..."],
  "areas_to_monitor": ["...", "..."],
  "suggested_focus": ["...", "..."],
  "discussion_points": ["...", "..."]
}
3-5 key_contributors, 2-4 items in each other list. Ground every sentence in the data given —
never invent a value that isn't there.`;

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
  // Allowed any time before sign-off starts producing a permanent record — this
  // also covers regenerating a draft that was created too early (e.g. before a
  // slow biomarker extraction had finished writing its rows).
  const REGENERATABLE_STATES = ["ai_drafted", "gp_review", "tcm_review"];
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
  const biologicalAge = computeBiologicalAge(scores, participant.age);
  const missingBiomarkers = computeMissingBiomarkers(rows);
  const outOfRange = computeOutOfRange(rows);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  let rawText: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 800,
      system: NARRATIVE_PROMPT,
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
    rawText = extractText(message.content);
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "AI draft generation failed" });
    return;
  }

  let narrative: {
    key_contributors: KeyContributor[];
    strengths: string[];
    areas_to_monitor: string[];
    suggested_focus: string[];
    discussion_points: string[];
  };
  try {
    narrative = parseJsonResponse(rawText || "{}");
  } catch {
    // Surface what Claude actually said instead of a generic message — otherwise
    // this failure mode is undiagnosable from the outside.
    const preview = rawText.trim().slice(0, 500) || "(empty response)";
    res.status(502).json({ error: `AI did not return valid JSON. Raw response: ${preview}` });
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
