import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { normalizeHealthAutoExport } from "../lib/wearables/healthAutoExport";
import { writeWearableBiomarkers } from "../lib/data/writeWearableBiomarkers";

// Receives Apple Health data pushed by the "Health Auto Export" iOS app (an
// unattended background automation), and lands it as biomarkers. There's no
// login session behind these requests, so they authenticate with the
// per-participant ingest_token (minted by api/health-ingest-setup) carried in
// either the `?token=` query or the `Authorization` header — the export app can
// send an arbitrary Authorization header value.
//
// The app doesn't sign its payload, so treat the body as untrusted: the token is
// the only authenticator, over HTTPS. Response echoes the metric names seen, so
// the exact HAE name strings can be confirmed against a live payload.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const q = req.query.token;
  const authRaw = req.headers.authorization;
  const bearer = authRaw?.startsWith("Bearer ") ? authRaw.slice(7) : authRaw;
  const ingestToken = (Array.isArray(q) ? q[0] : q) || bearer || null;
  if (!ingestToken) {
    res.status(401).json({ error: "Missing ingest token" });
    return;
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: participant, error: lookupErr } = await service
    .from("participants")
    .select("id")
    .eq("ingest_token", ingestToken)
    .maybeSingle();
  if (lookupErr) {
    res.status(500).json({ error: lookupErr.message });
    return;
  }
  if (!participant) {
    res.status(403).json({ error: "Invalid ingest token" });
    return;
  }

  const { values, metricNames } = normalizeHealthAutoExport(req.body);

  try {
    const written = await writeWearableBiomarkers(service, participant.id, values, {
      source: "apple_health",
      attentionReason: "New Apple Health data synced — biomarkers pending review",
    });
    res.status(200).json({ ok: true, written, metricNames });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to write biomarkers" });
  }
}
