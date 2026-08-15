import crypto from "crypto";
import type { ParsedWearableValue } from "../data/writeWearableBiomarkers";

// Terra API helpers — kept free of Supabase/HTTP-handler concerns so the webhook
// and connect endpoints stay thin and this stays unit-testable.
// Field paths and the signature scheme are per Terra's documented API
// (see api/terra-webhook.ts header for the reference and gotchas).

export const TERRA_API_BASE = "https://api.tryterra.co/v2";

/**
 * Verify a Terra webhook signature. Header format is `t=<unix>,v1=<hmac_hex>`;
 * the signed message is `${t}.${rawBody}` (the RAW request body — any
 * reserialization breaks this), HMAC-SHA256 with the destination Signing Secret,
 * hex-encoded. Constant-time compared.
 */
export function verifyTerraSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  signingSecret: string
): boolean {
  if (!signatureHeader) return false;
  const parts: Record<string, string> = {};
  for (const kv of signatureHeader.split(",")) {
    const idx = kv.indexOf("=");
    if (idx === -1) continue;
    parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
  }
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(`${t}.${rawBody}`, "utf8")
    .digest("hex");

  const a = Buffer.from(v1, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface WidgetSessionResult {
  url: string;
  sessionId?: string;
  expiresIn?: number;
}

/**
 * Create a Terra Widget session and return the URL to redirect the user to so
 * they can connect a wearable provider. `referenceId` is our participant id —
 * Terra echoes it back on the auth webhook and every data event.
 */
export async function createWidgetSession(opts: {
  devId: string;
  apiKey: string;
  referenceId: string;
  providers?: string;
  language?: string;
  authSuccessRedirectUrl?: string;
  authFailureRedirectUrl?: string;
}): Promise<WidgetSessionResult> {
  const res = await fetch(`${TERRA_API_BASE}/auth/generateWidgetSession`, {
    method: "POST",
    headers: {
      "dev-id": opts.devId,
      "x-api-key": opts.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reference_id: opts.referenceId,
      // Terra expects a single comma-separated string, not an array.
      providers: opts.providers,
      language: opts.language ?? "en",
      auth_success_redirect_url: opts.authSuccessRedirectUrl,
      auth_failure_redirect_url: opts.authFailureRedirectUrl,
    }),
  });

  const data = (await res.json()) as { url?: string; session_id?: string; expires_in?: number; message?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.message ?? `Terra widget session failed (${res.status})`);
  }
  return { url: data.url, sessionId: data.session_id, expiresIn: data.expires_in };
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Normalize one Terra webhook data event (its `type` + `data[]` array) into our
 * biomarker vocabulary. Reads defensively — every provider omits some fields, and
 * paths nest differently per payload type. Keeps the latest defined value per key
 * across the data array. Unknown keys are dropped downstream by writeWearableBiomarkers.
 */
export function normalizeTerraPayload(type: string, data: unknown[]): ParsedWearableValue[] {
  const latest: Record<string, number> = {};
  const set = (key: string, value: number | null) => {
    if (value !== null) latest[key] = value;
  };

  for (const raw of data ?? []) {
    const item = raw as Record<string, any>;

    // Heart summary lives at heart_rate_data.summary on daily/sleep, and is
    // nested under heart_data on body payloads.
    const heartSummary =
      item?.heart_rate_data?.summary ?? item?.heart_data?.heart_rate_data?.summary ?? null;
    if (heartSummary) {
      set("resting_hr", num(heartSummary.resting_hr_bpm));
      // Our catalog's hrv range (40-70 ms) is SDNN-shaped; fall back to RMSSD.
      set("hrv", num(heartSummary.avg_hrv_sdnn) ?? num(heartSummary.avg_hrv_rmssd));
    }

    // Sleep duration (seconds -> hours).
    const asleepSec = num(item?.sleep_durations_data?.asleep?.duration_asleep_state_seconds);
    if (asleepSec !== null) set("sleep_hours", asleepSec / 3600);

    // Body measurements (array; take the last item carrying each field).
    const measurements: any[] = item?.measurements_data?.measurements ?? [];
    for (const m of measurements) {
      set("bmi", num(m?.BMI));
      let bodyFat = num(m?.bodyfat_percentage);
      // Some providers report a 0-1 fraction; our catalog expects a percentage.
      if (bodyFat !== null && bodyFat > 0 && bodyFat <= 1) bodyFat = bodyFat * 100;
      set("body_fat_pct", bodyFat);
    }
  }

  return Object.entries(latest).map(([key, value]) => ({ key, value }));
}
