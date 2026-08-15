import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createWidgetSession } from "../lib/wearables/terra";

// Authenticated endpoint (participant Bearer JWT) that starts a Terra Widget
// session and returns the URL to redirect the participant to so they can connect
// a wearable provider (Oura, Garmin, Fitbit, Whoop, ...). We pass reference_id =
// participantId so Terra tags the connection + all future data with it.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const TERRA_DEV_ID = process.env.TERRA_DEV_ID;
const TERRA_API_KEY = process.env.TERRA_API_KEY;
// Optional: restrict the provider list shown in the widget (comma-separated).
const TERRA_PROVIDERS = process.env.TERRA_PROVIDERS;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!TERRA_DEV_ID || !TERRA_API_KEY) {
    res.status(501).json({ error: "Terra is not configured on this deployment" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const { participantId, successUrl, failureUrl } = req.body ?? {};
  if (!participantId) {
    res.status(400).json({ error: "participantId is required" });
    return;
  }

  // Verify the caller owns this participant (RLS: participant reads own record).
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: owned, error: ownErr } = await callerClient
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .maybeSingle();
  if (ownErr || !owned) {
    res.status(403).json({ error: "Not authorized for this participant" });
    return;
  }

  try {
    const session = await createWidgetSession({
      devId: TERRA_DEV_ID,
      apiKey: TERRA_API_KEY,
      referenceId: participantId,
      providers: TERRA_PROVIDERS,
      authSuccessRedirectUrl: typeof successUrl === "string" ? successUrl : undefined,
      authFailureRedirectUrl: typeof failureUrl === "string" ? failureUrl : undefined,
    });
    res.status(200).json({ url: session.url, expiresIn: session.expiresIn });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "Could not start Terra session" });
  }
}
