import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { RECOGNIZE_CATALOG_BY_KEY } from "../lib/ai/recognizeCatalog";
import {
  scoreWho5,
  scorePss4,
  QUESTIONNAIRE_CATALOG_BY_KEY,
} from "../lib/ai/mentalQuestionnaire";
import { isMarkerFlagged } from "../lib/ai/markerDirection";
import { sdmtToComposite, sdmtScore } from "../lib/ai/symbolDigit";
import { flagIfPastSignoff } from "../lib/data/pipelineAttention";
import { resyncDraftScores } from "../lib/data/resyncDraftScores";
import { regenerateDraft } from "../lib/ai/draftGeneration";

// Vercel serverless function. One endpoint for BOTH halves of the Mental capture
// — the ReCOGnAIze reaction-time test (trialsMs) and the WHO-5 + PSS-4
// questionnaires (who5/pss4). Merged into a single function to stay under the
// Vercel Hobby-plan 12-function cap; it writes whichever inputs are provided, so
// the client can submit either half independently (as the flow does today) or
// both together. Both tests run client-side; this only scores + persists the
// derived mental biomarkers (raw answers/trials aren't stored → no schema change).

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Maps average reaction time (ms) onto the 0-100 cognitive composite scale
// (250ms -> 100, 400ms -> 70, matching reaction_time's own reference band),
// extrapolated and clamped beyond that.
function cognitiveComposite(avgReactionTimeMs: number): number {
  const t = (avgReactionTimeMs - 250) / (400 - 250);
  return Math.round(Math.max(0, Math.min(100, 100 - t * 30)));
}

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

  const { participantId, trialsMs, sdmt, who5, pss4 } = req.body ?? {};
  if (!participantId) {
    res.status(400).json({ error: "participantId is required" });
    return;
  }

  const hasTrials = Array.isArray(trialsMs) && trialsMs.length > 0;
  const hasSdmt =
    sdmt && typeof sdmt.correct === "number" && typeof sdmt.errors === "number" &&
    sdmt.correct >= 0 && sdmt.errors >= 0 && sdmt.correct < 1000 && sdmt.errors < 1000;
  const hasQuestionnaire = Array.isArray(who5) && Array.isArray(pss4);
  if (!hasTrials && !hasSdmt && !hasQuestionnaire) {
    res.status(400).json({ error: "Provide sdmt (Symbol-Digit result), trialsMs, and/or who5+pss4" });
    return;
  }

  const values: Record<string, number> = {};
  // Extra fields echoed back to the client but NOT written as scored biomarkers
  // (e.g. the raw Symbol-Digit net score — informative, but averaging a raw count
  // into the 0-100 Mental pillar would corrupt it, so only cog_composite is stored).
  const echo: Record<string, number> = {};

  // Symbol-Digit game (the current ReCOGnAIze cognitive test): derive the 0-100
  // cognitive composite the Mental pillar scores. Preferred over trialsMs.
  if (hasSdmt) {
    values.cog_composite = sdmtToComposite(sdmt.correct, sdmt.errors);
    echo.sdmt_score = sdmtScore(sdmt.correct, sdmt.errors);
  } else if (hasTrials) {
    // Legacy reaction-time path, kept for backward compatibility.
    if (!trialsMs.every((t: unknown) => typeof t === "number" && t > 0 && t < 5000)) {
      res.status(400).json({ error: "trialsMs must contain plausible reaction times in milliseconds" });
      return;
    }
    const avg = Math.round(trialsMs.reduce((sum: number, t: number) => sum + t, 0) / trialsMs.length);
    values.reaction_time = avg;
    values.cog_composite = cognitiveComposite(avg);
  }

  if (hasQuestionnaire) {
    try {
      values.who5_wellbeing = scoreWho5(who5);
      values.pss4_stress = scorePss4(pss4);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Invalid questionnaire answers" });
      return;
    }
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

  // Biomarkers are participant-read-only in RLS — needs the service-role key.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const catalogFor = (key: string) => RECOGNIZE_CATALOG_BY_KEY[key] ?? QUESTIONNAIRE_CATALOG_BY_KEY[key];
  const sourceFor = (key: string) => (RECOGNIZE_CATALOG_BY_KEY[key] ? "recognize" : "questionnaire");

  const rows = Object.entries(values).map(([key, value]) => {
    const entry = catalogFor(key);
    return {
      participant_id: participantId,
      pillar: entry.pillar,
      key: entry.key,
      label: entry.label,
      value,
      unit: entry.unit,
      ref_low: entry.ref_low,
      ref_high: entry.ref_high,
      source: sourceFor(key),
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

  await flagIfPastSignoff(serviceClient, participantId, "New Mental-pillar results submitted — biomarkers pending review");
  // Re-derive scores/bio age from the just-written values, then re-run the full
  // draft (AI narrative too) best-effort.
  await resyncDraftScores(serviceClient, participantId);
  try {
    await regenerateDraft(serviceClient, participantId);
  } catch {
    /* numbers already resynced above */
  }

  res.status(200).json({ ...values, ...echo });
}
