import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import {
  scoreWho5,
  scorePss4,
  QUESTIONNAIRE_CATALOG_BY_KEY,
} from "../lib/ai/mentalQuestionnaire";
import { isMarkerFlagged } from "../lib/ai/markerDirection";
import { flagIfPastSignoff } from "../lib/data/pipelineAttention";
import { resyncDraftScores } from "../lib/data/resyncDraftScores";
import { regenerateDraft } from "../lib/ai/draftGeneration";

// Vercel serverless function (see vercel.json). Like submit-recognize, there's
// no AI call — the WHO-5 + PSS-4 questionnaires run entirely client-side and this
// endpoint just scores and persists the two derived mental biomarkers. It's a
// server route (not a direct client write) because biomarkers are
// participant-read-only under RLS. Raw item answers are intentionally NOT stored
// (mirrors ReCOGnAIze), so no schema change.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

  const { participantId, who5, pss4 } = req.body ?? {};
  if (!participantId || !Array.isArray(who5) || !Array.isArray(pss4)) {
    res.status(400).json({ error: "participantId, who5[] and pss4[] are required" });
    return;
  }

  let who5Score: number;
  let pss4Score: number;
  try {
    who5Score = scoreWho5(who5);
    pss4Score = scorePss4(pss4);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid questionnaire answers" });
    return;
  }

  // Scoped to the caller's own session — RLS decides whether they can act for
  // this participant at all (their own record, or a care_team account).
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: pipeline } = await callerClient
    .from("pipeline")
    .select("participant_id")
    .eq("participant_id", participantId)
    .maybeSingle();
  if (!pipeline) {
    res.status(403).json({ error: "Not authorized for this participant" });
    return;
  }

  const values: Record<string, number> = { who5_wellbeing: who5Score, pss4_stress: pss4Score };

  // Biomarkers are participant-read-only in RLS — needs the service-role key.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const rows = Object.entries(values).map(([key, value]) => {
    const entry = QUESTIONNAIRE_CATALOG_BY_KEY[key];
    return {
      participant_id: participantId,
      pillar: entry.pillar,
      key: entry.key,
      label: entry.label,
      value,
      unit: entry.unit,
      ref_low: entry.ref_low,
      ref_high: entry.ref_high,
      source: "questionnaire",
      status: "entered",
      flagged: isMarkerFlagged(entry.key, value, entry.ref_low, entry.ref_high),
      updated_at: new Date().toISOString(),
    };
  });

  const { error: upsertErr } = await serviceClient
    .from("biomarkers")
    .upsert(rows, { onConflict: "participant_id,key" });
  if (upsertErr) {
    res.status(500).json({ error: upsertErr.message });
    return;
  }

  await flagIfPastSignoff(serviceClient, participantId, "New wellbeing questionnaire submitted — biomarkers pending review");
  // Re-derive scores/bio age from the just-written values, then re-run the full
  // draft (AI narrative too) best-effort.
  await resyncDraftScores(serviceClient, participantId);
  try {
    await regenerateDraft(serviceClient, participantId);
  } catch {
    /* numbers already resynced above */
  }

  res.status(200).json({ who5_wellbeing: who5Score, pss4_stress: pss4Score });
}
