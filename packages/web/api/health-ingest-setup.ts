import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// Mints (once) and returns the per-participant ingest token + full POST URL that
// the health-export app (e.g. Health Auto Export) is configured to push Apple
// Health JSON to. The token authenticates that unattended device automation to
// /api/health-ingest without a login session. Authenticated as the participant
// (Bearer JWT); the token itself is generated and stored server-side with the
// service role so it never depends on client RNG.

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

  const { participantId, rotate } = req.body ?? {};
  if (!participantId) {
    res.status(400).json({ error: "participantId is required" });
    return;
  }

  // Verify the caller owns this participant via RLS (participant reads own record).
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: owned, error: ownErr } = await callerClient
    .from("participants")
    .select("id, ingest_token")
    .eq("id", participantId)
    .maybeSingle();
  if (ownErr || !owned) {
    res.status(403).json({ error: "Not authorized for this participant" });
    return;
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let ingestToken: string | null = owned.ingest_token ?? null;
  if (!ingestToken || rotate) {
    ingestToken = randomBytes(32).toString("base64url");
    const { error: updErr } = await service
      .from("participants")
      .update({ ingest_token: ingestToken })
      .eq("id", participantId);
    if (updErr) {
      res.status(500).json({ error: updErr.message });
      return;
    }
  }

  // Build the absolute URL the export app posts to, from the request host.
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const host = req.headers.host;
  const url = `${proto}://${host}/api/health-ingest?token=${ingestToken}`;

  res.status(200).json({ token: ingestToken, url });
}
