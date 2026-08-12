import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { RECOGNIZE_CATALOG_BY_KEY } from "../lib/ai/recognizeCatalog";
import { flagIfPastSignoff } from "../lib/data/pipelineAttention";
import { resyncDraftScores } from "../lib/data/resyncDraftScores";
import { regenerateDraft } from "../lib/ai/draftGeneration";

// This is a Vercel serverless function — see vercel.json's rewrite, which
// excludes /api/* from the SPA catch-all so requests here reach this file
// instead of index.html.
//
// Unlike the extract-*.ts routes, there's no AI call here -- the reaction-time
// test itself runs entirely client-side (a stimulus/response timer needs no
// server round-trip), and this endpoint just persists the result. It still
// needs to be a server route rather than a direct client write because
// biomarkers are participant-read-only in RLS (care team/service role write
// them), even when the data came straight from this participant's own test.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Maps average reaction time (ms) onto the 0-100 cognitive composite scale,
// anchored so the two biomarkers' healthy bands line up (250ms -> 100,
// 400ms -> 70, matching reaction_time's own reference band), extrapolated
// and clamped beyond that rather than only valid inside it.
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

  const { participantId, trialsMs } = req.body ?? {};
  if (!participantId || !Array.isArray(trialsMs) || trialsMs.length === 0) {
    res.status(400).json({ error: "participantId and a non-empty trialsMs array are required" });
    return;
  }
  if (!trialsMs.every((t: unknown) => typeof t === "number" && t > 0 && t < 5000)) {
    res.status(400).json({ error: "trialsMs must contain plausible reaction times in milliseconds" });
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

  const avgReactionTimeMs = Math.round(
    trialsMs.reduce((sum: number, t: number) => sum + t, 0) / trialsMs.length
  );
  const composite = cognitiveComposite(avgReactionTimeMs);
  const values: Record<string, number> = { reaction_time: avgReactionTimeMs, cog_composite: composite };

  // Biomarkers are participant-read-only in RLS — needs the service-role key.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const rows = Object.entries(values).map(([key, value]) => {
    const entry = RECOGNIZE_CATALOG_BY_KEY[key];
    return {
      participant_id: participantId,
      pillar: entry.pillar,
      key: entry.key,
      label: entry.label,
      value,
      unit: entry.unit,
      ref_low: entry.ref_low,
      ref_high: entry.ref_high,
      source: "recognize",
      status: "entered",
      flagged: value < entry.ref_low || value > entry.ref_high,
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
  await flagIfPastSignoff(serviceClient, participantId, "New ReCOGnAIze results submitted — biomarkers pending review");
  // Re-derive scores/bio age from the just-written values (see resyncDraftScores),
  // then re-run the full draft (AI narrative too) best-effort.
  await resyncDraftScores(serviceClient, participantId);
  try {
    await regenerateDraft(serviceClient, participantId);
  } catch {
    /* numbers already resynced above */
  }

  res.status(200).json({ reaction_time: avgReactionTimeMs, cog_composite: composite });
}
