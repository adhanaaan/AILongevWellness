import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { verifyTerraSignature, normalizeTerraPayload } from "../lib/wearables/terra";
import { writeWearableBiomarkers } from "../lib/data/writeWearableBiomarkers";

// Terra webhook receiver. Terra POSTs here on connection (`auth`) and whenever
// new wearable data is available (`daily`/`sleep`/`body`/`activity`/...), tagged
// with the reference_id we set at connect time = the participant id.
//
// SECURITY: the request is authenticated by the `terra-signature` header
// (HMAC-SHA256 over `${t}.${rawBody}` with the destination Signing Secret). That
// REQUIRES the raw, unparsed body — so Vercel's body parser is disabled here and
// the stream is buffered manually. Reserializing req.body would change byte order
// and break verification.

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TERRA_SIGNING_SECRET = process.env.TERRA_SIGNING_SECRET;

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer | string) =>
      chunks.push(typeof c === "string" ? Buffer.from(c) : c)
    );
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!TERRA_SIGNING_SECRET) {
    res.status(501).json({ error: "Terra is not configured on this deployment" });
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["terra-signature"] as string | undefined;
  if (!verifyTerraSignature(rawBody, signature, TERRA_SIGNING_SECRET)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const type: string = payload?.type ?? "";
  const user = payload?.user ?? {};
  const terraUserId: string | undefined = user.user_id;
  const referenceId: string | undefined = user.reference_id ?? payload?.reference_id;
  const provider: string | null = user.provider ?? null;

  // Connection event: record the provider link so we can show it and resolve
  // future data events that omit reference_id.
  if (type === "auth") {
    if (payload?.status && payload.status !== "success") {
      res.status(200).json({ ok: true });
      return;
    }
    if (terraUserId && referenceId) {
      await service
        .from("wearable_connections")
        .upsert(
          {
            participant_id: referenceId,
            terra_user_id: terraUserId,
            provider,
            connected_at: new Date().toISOString(),
          },
          { onConflict: "terra_user_id" }
        );
    }
    res.status(200).json({ ok: true });
    return;
  }

  // Data event: resolve the participant (reference_id preferred; fall back to the
  // stored connection by terra_user_id), normalize, and write biomarkers.
  let participantId = referenceId ?? null;
  if (!participantId && terraUserId) {
    const { data: conn } = await service
      .from("wearable_connections")
      .select("participant_id")
      .eq("terra_user_id", terraUserId)
      .maybeSingle();
    participantId = conn?.participant_id ?? null;
  }
  if (!participantId) {
    // Nothing we can attribute — ack so Terra doesn't retry forever.
    res.status(200).json({ ok: true, ignored: "no reference_id" });
    return;
  }

  const values = normalizeTerraPayload(type, Array.isArray(payload?.data) ? payload.data : []);
  try {
    const written = await writeWearableBiomarkers(service, participantId, values, {
      source: "wearable",
      attentionReason: `New ${provider ?? "wearable"} data synced — biomarkers pending review`,
    });
    res.status(200).json({ ok: true, written });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to write biomarkers" });
  }
}
