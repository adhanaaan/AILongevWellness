import type { VercelRequest, VercelResponse } from "@vercel/node";
import { missingServerEnv, CORE_API_ENV } from "../lib/config/serverEnv";
import { createClient } from "@supabase/supabase-js";
import { regenerateDraft, REGENERATABLE_STATES } from "../lib/ai/draftGeneration";

// This is a Vercel serverless function (not an Expo Router API route) — see
// vercel.json's rewrite, which excludes /api/* from the SPA catch-all.
//
// The actual draft (re)generation lives in lib/ai/draftGeneration.ts so the
// extraction endpoints can run the exact same full regeneration after they write
// biomarkers. This handler is just the authenticated entry point.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const missing = missingServerEnv(CORE_API_ENV);
  if (missing.length > 0) {
    res.status(500).json({ error: `Server misconfigured — missing env var(s): ${missing.join(", ")}` });
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
    .select("state")
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!pipeline) {
    res.status(403).json({ error: "Not authorized for this participant" });
    return;
  }
  if (!REGENERATABLE_STATES.includes(pipeline.state)) {
    res.status(409).json({ error: `Cannot generate a draft while pipeline is in state "${pipeline.state}"` });
    return;
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const result = await regenerateDraft(serviceClient, participantId);
    if (result.status === "skipped") {
      if (result.reason === "no_participant") {
        res.status(404).json({ error: "Participant not found" });
        return;
      }
      res.status(409).json({ error: "Draft is not in a regeneratable state" });
      return;
    }
    res.status(200).json({ draft: result.draft });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "AI draft generation failed" });
  }
}
