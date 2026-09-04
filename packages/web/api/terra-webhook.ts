import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
//
// Everything below console.log()s under the [terra-webhook] tag so the flow is
// visible in Vercel → your project → Logs (or `vercel logs`). If you connect a
// device and see NO [terra-webhook] lines at all, Terra isn't reaching this
// endpoint — the destination is in the wrong Terra environment (e.g. set in
// Production while you connect in Testing), or the URL is wrong. If you DO see
// lines, they say exactly where it stops.

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TERRA_SIGNING_SECRET = process.env.TERRA_SIGNING_SECRET;

const TAG = "[terra-webhook]";

async function markWearableChannel(
  service: SupabaseClient,
  participantId: string,
  status: "partial" | "complete"
): Promise<void> {
  const { error } = await service.from("capture_channels").upsert(
    {
      participant_id: participantId,
      channel: "wearables",
      status,
      entered_by: "participant",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id,channel" }
  );
  if (error) console.error(`${TAG} capture_channels upsert failed:`, error.message);
}

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
    console.error(`${TAG} TERRA_SIGNING_SECRET is not set — returning 501`);
    res.status(501).json({ error: "Terra is not configured on this deployment" });
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["terra-signature"] as string | undefined;
  console.log(
    `${TAG} hit: rawBodyLen=${rawBody.length} hasSignature=${Boolean(signature)}`
  );
  // rawBodyLen=0 here means Vercel consumed the body before we read it (the
  // bodyParser:false config wasn't honored) — signature verification can't work
  // and we'd need a different raw-body strategy. Flag it loudly.
  if (rawBody.length === 0) {
    console.error(`${TAG} raw body is EMPTY — body parser likely not disabled`);
  }

  if (!verifyTerraSignature(rawBody, signature, TERRA_SIGNING_SECRET)) {
    console.warn(
      `${TAG} SIGNATURE VERIFICATION FAILED — check that TERRA_SIGNING_SECRET matches this ` +
        `destination's Signing Secret in the SAME Terra environment. rawBodyLen=${rawBody.length} ` +
        `sigHeaderPrefix=${signature?.slice(0, 24) ?? "(none)"}`
    );
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error(`${TAG} JSON parse failed`);
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const type: string = payload?.type ?? "";
  const user = payload?.user ?? {};
  const terraUserId: string | undefined = user.user_id;
  const referenceId: string | undefined = user.reference_id ?? payload?.reference_id;
  const provider: string | null = user.provider ?? null;
  console.log(
    `${TAG} verified: type=${type} provider=${provider ?? "?"} referenceId=${referenceId ?? "(none)"} ` +
      `terraUserId=${terraUserId ?? "(none)"} dataLen=${Array.isArray(payload?.data) ? payload.data.length : 0}`
  );

  // Connection event: record the provider link so we can show it and resolve
  // future data events that omit reference_id.
  if (type === "auth") {
    if (payload?.status && payload.status !== "success") {
      console.log(`${TAG} auth event with status=${payload.status} — acking, not storing`);
      res.status(200).json({ ok: true });
      return;
    }
    if (terraUserId && referenceId) {
      const { error } = await service
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
      if (error) {
        console.error(`${TAG} wearable_connections upsert failed:`, error.message);
      } else {
        console.log(`${TAG} connection stored: ${provider} -> participant ${referenceId}`);
      }
      await markWearableChannel(service, referenceId, "partial");
    } else {
      console.warn(
        `${TAG} auth event missing terraUserId or referenceId — cannot store connection`
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
    console.warn(`${TAG} data event but no participant could be resolved — acking, ignoring`);
    res.status(200).json({ ok: true, ignored: "no reference_id" });
    return;
  }

  const values = normalizeTerraPayload(type, Array.isArray(payload?.data) ? payload.data : []);
  console.log(
    `${TAG} normalized ${values.length} biomarker value(s) from a '${type}' payload` +
      (values.length === 0
        ? ` — none of this payload's fields map to our catalog (e.g. Strava activities carry no resting HR/HRV/sleep/body metrics)`
        : ` (${values.map((v) => v.key).join(", ")})`)
  );
  try {
    const written = await writeWearableBiomarkers(service, participantId, values, {
      source: "wearable",
      attentionReason: `New ${provider ?? "wearable"} data synced — biomarkers pending review`,
    });
    if (written.length > 0) {
      await markWearableChannel(service, participantId, "complete");
    }
    console.log(`${TAG} wrote ${written.length} biomarker(s) for participant ${participantId}`);
    res.status(200).json({ ok: true, written });
  } catch (e) {
    console.error(`${TAG} writeWearableBiomarkers failed:`, e instanceof Error ? e.message : e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to write biomarkers" });
  }
}
