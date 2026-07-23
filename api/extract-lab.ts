import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { LAB_CATALOG_BY_KEY } from "../lib/ai/labCatalog";
import { BUCKET_BY_KIND } from "../lib/data/storageBuckets";
import { convertToTargetUnit } from "../lib/ai/unitConversion";

// This is a Vercel serverless function (not an Expo Router API route) — see
// vercel.json's rewrite, which excludes /api/* from the SPA catch-all so
// requests here reach this file instead of index.html.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const EXTRACTION_PROMPT = `You are extracting standard blood panel results from a lab report image or PDF.

Only report values for these exact keys (common aliases a real report might use are listed
in parentheses — match on meaning, not exact wording):

Vascular:
- total_cholesterol (Total Cholesterol, Cholesterol)
- ldl_c (LDL, LDL-C, LDL Cholesterol)
- hdl_c (HDL, HDL-C, HDL Cholesterol)
- triglycerides (Triglycerides, TG)
- hscrp (hs-CRP, high sensitivity CRP, CRP)
- homocysteine (Homocysteine, Hcy)
- lpa (Lipoprotein(a), Lp(a))

Metabolic:
- fasting_glucose (Fasting Glucose, Glucose, FBG, FPG)
- hba1c (HbA1c, Glycated Haemoglobin, A1C)
- fasting_insulin (Fasting Insulin, Insulin)
- vitamin_d (Vitamin D, 25-OH Vitamin D, Vitamin D 25-Hydroxy)
- vitamin_b12 (Vitamin B12, B12)
- ferritin (Ferritin)
- uric_acid (Uric Acid, Urate)
- alt (ALT, SGPT, Alanine Aminotransferase)
- ast (AST, SGOT, Aspartate Aminotransferase)
- creatinine (Creatinine)
- egfr (eGFR, Estimated GFR, GFR)
- tsh (TSH, Thyroid Stimulating Hormone)

Rules:
- Report the value and unit EXACTLY as printed on the document (e.g. if it prints
  "Cholesterol, Total 5.8 mmol/L" report value 5.8, unit "mmol/L"; if it prints
  "Creatinine 88 umol/L" report value 88, unit "umol/L"). Do NOT convert units yourself —
  unit conversion is handled afterward in code from whatever unit you report.
- Skip any key not present in the document. Do not guess or estimate a value.
- Do NOT report tumor markers (e.g. AFP, CEA, CA19-9, CA15.3, PSA), cancer screening
  results, or infectious disease serology (e.g. Hepatitis, EBV) even if present in the
  document — this platform is wellness-only, not diagnostic.

Call report_lab_values with what you found.`;

// Forcing a tool call instead of asking Claude to free-write a JSON string: the
// API validates/constrains the output to this schema server-side, so there's no
// JSON.parse involved and no way for a stray quote or markdown fence in the
// model's output to break parsing.
const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "report_lab_values",
  description: "Report the lab values found in the document.",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "number" },
            unit: { type: "string", description: "The unit exactly as printed on the document, e.g. 'mg/dL'." },
          },
          required: ["key", "value", "unit"],
        },
      },
    },
    required: ["results"],
  },
};

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

  let parsed: { results: Array<{ key: string; value: number; unit: string }> };
  try {
    const content =
      mediaType === "application/pdf"
        ? ({ type: "document", source: { type: "base64", media_type: mediaType, data: base64 } } as const)
        : ({ type: "image", source: { type: "base64", media_type: mediaType as any, data: base64 } } as const);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: "report_lab_values" },
      messages: [
        {
          role: "user",
          content: [content, { type: "text", text: EXTRACTION_PROMPT }],
        },
      ],
    });
    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      res.status(502).json({ error: "AI did not call the expected tool" });
      return;
    }
    parsed = toolUse.input as typeof parsed;
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "AI extraction failed" });
    return;
  }

  const rows = (parsed.results ?? [])
    .filter((r) => LAB_CATALOG_BY_KEY[r.key] && typeof r.value === "number")
    .map((r) => {
      const entry = LAB_CATALOG_BY_KEY[r.key];
      const value = convertToTargetUnit(entry.key, r.value, r.unit ?? entry.unit, entry.unit);
      return {
        participant_id: participantId,
        pillar: entry.pillar,
        key: entry.key,
        label: entry.label,
        value,
        unit: entry.unit,
        ref_low: entry.ref_low,
        ref_high: entry.ref_high,
        source: "lab_extract",
        status: "needs_review",
        flagged: value < entry.ref_low || value > entry.ref_high,
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
