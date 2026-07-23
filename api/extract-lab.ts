import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { LAB_CATALOG_BY_KEY } from "../lib/ai/labCatalog";
import { BUCKET_BY_KIND } from "../lib/data/storageBuckets";

// This is a Vercel serverless function (not an Expo Router API route) — see
// vercel.json's rewrite, which excludes /api/* from the SPA catch-all so
// requests here reach this file instead of index.html.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const EXTRACTION_PROMPT = `You are extracting standard blood panel results from a lab report image or PDF.

Only report values for these exact keys, using the exact target unit shown (convert if the
document uses a different but equivalent unit, e.g. cholesterol mg/dL -> mmol/L is value / 38.67,
glucose mmol/L -> mg/dL is value * 18.02):

- total_cholesterol (mmol/L)
- ldl_c (mmol/L)
- hdl_c (mmol/L)
- hscrp (mg/L) — also written "hs-CRP" or "high sensitivity CRP"
- fasting_glucose (mg/dL)
- hba1c (%)
- vitamin_d (nmol/L) — also written "25-OH vitamin D" or "vitamin D, 25-hydroxy"

Skip any key not present in the document. Reply with ONLY a JSON object, no prose, no markdown
fences, in exactly this shape:
{"results": [{"key": "total_cholesterol", "value": 4.9}, ...]}`;

// Trusts the file extension first — we control storage_path ourselves at upload
// time, so it's a more reliable signal than whatever content-type Supabase
// Storage happens to echo back (which can come back as a generic
// application/octet-stream depending on how the upload set it). Claude's vision
// API rejects anything outside this exact set of media types, so a wrong guess
// here fails the whole extraction with no visible reason.
function detectMediaType(storagePath: string, blobType: string): string {
  const lower = storagePath.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (blobType === "application/pdf" || blobType.startsWith("image/")) return blobType;
  return "image/jpeg";
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

  const { participantId, fileId } = req.body ?? {};
  if (!participantId || !fileId) {
    res.status(400).json({ error: "participantId and fileId are required" });
    return;
  }

  // Scoped to the caller's own session — RLS decides whether they can see this
  // file at all (their own upload, or a care_team account).
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: fileRow, error: fileErr } = await callerClient
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (fileErr || !fileRow) {
    res.status(403).json({ error: "Not authorized for this file" });
    return;
  }

  // Extraction writes to biomarkers as the system, not the participant — biomarkers
  // are participant-read-only in RLS, so this step needs the service-role key.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const bucket = BUCKET_BY_KIND[fileRow.kind as keyof typeof BUCKET_BY_KIND];
  const { data: blob, error: downloadErr } = await serviceClient.storage
    .from(bucket)
    .download(fileRow.storage_path);
  if (downloadErr || !blob) {
    res.status(500).json({ error: downloadErr?.message ?? "Could not download file" });
    return;
  }

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = detectMediaType(fileRow.storage_path, blob.type);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  let raw: string;
  try {
    const content =
      mediaType === "application/pdf"
        ? ({ type: "document", source: { type: "base64", media_type: mediaType, data: base64 } } as const)
        : ({ type: "image", source: { type: "base64", media_type: mediaType as any, data: base64 } } as const);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [content, { type: "text", text: EXTRACTION_PROMPT }],
        },
      ],
    });
    const block = message.content[0];
    raw = block.type === "text" ? block.text : "";
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "AI extraction failed" });
    return;
  }

  let parsed: { results: Array<{ key: string; value: number }> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    res.status(502).json({ error: "AI did not return valid JSON" });
    return;
  }

  const rows = (parsed.results ?? [])
    .filter((r) => LAB_CATALOG_BY_KEY[r.key] && typeof r.value === "number")
    .map((r) => {
      const entry = LAB_CATALOG_BY_KEY[r.key];
      return {
        participant_id: participantId,
        pillar: entry.pillar,
        key: entry.key,
        label: entry.label,
        value: r.value,
        unit: entry.unit,
        ref_low: entry.ref_low,
        ref_high: entry.ref_high,
        source: "lab_extract",
        status: "needs_review",
        flagged: r.value < entry.ref_low || r.value > entry.ref_high,
        updated_at: new Date().toISOString(),
      };
    });

  if (rows.length > 0) {
    const { error: upsertErr } = await serviceClient
      .from("biomarkers")
      .upsert(rows, { onConflict: "participant_id,key" });
    if (upsertErr) {
      res.status(500).json({ error: upsertErr.message });
      return;
    }
  }

  await serviceClient.from("files").update({ extracted: true }).eq("id", fileId);

  res.status(200).json({ extracted: rows.map((r) => r.key) });
}
