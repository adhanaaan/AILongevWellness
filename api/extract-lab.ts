import type { VercelRequest, VercelResponse } from "@vercel/node";
import { missingServerEnv, CORE_API_ENV } from "../lib/config/serverEnv";
import { sniffMediaType, UNSUPPORTED_FILE_MESSAGE } from "../lib/ai/sniffMediaType";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { LAB_CATALOG_BY_KEY } from "../lib/ai/labCatalog";
import { isMarkerFlagged } from "../lib/ai/markerDirection";
import { sexAwareRange } from "../lib/ai/sexAwareRanges";
import { BUCKET_BY_KIND } from "../lib/data/storageBuckets";
import { convertToTargetUnit, isUnitConvertible } from "../lib/ai/unitConversion";
import { flagIfPastSignoff } from "../lib/data/pipelineAttention";
import { writeBiomarkerReadings } from "../lib/data/biomarkerReadings";
import { resyncDraftScores } from "../lib/data/resyncDraftScores";

// This is a Vercel serverless function (not an Expo Router API route) — see
// vercel.json's rewrite, which excludes /api/* from the SPA catch-all so
// requests here reach this file instead of index.html.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const EXTRACTION_PROMPT = `You are extracting results from a health report image or PDF. This may be
either (a) a standard blood panel from a lab, or (b) a continuous glucose monitor
(CGM) summary report (e.g. Freestyle Libre, Dexcom, Buzud) — identify which one you're
looking at and extract only the keys that apply.

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

Metabolic (standard blood panel):
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

Metabolic (CBC + general chemistry -- only present on a report that includes a full
blood count, not every basic panel):
- albumin (Albumin)
- lymphocyte_pct (Lymphocytes %, Lymphocyte Percent, LYMPH%) -- only the percentage, never an absolute count
- mcv (MCV, Mean Corpuscular Volume, Mean Cell Volume)
- rdw (RDW, RDW-CV, Red Cell Distribution Width) -- only the percentage version (RDW-CV);
  never RDW-SD, which is reported in fL, not %
- alp (ALP, Alkaline Phosphatase)
- wbc (WBC, White Blood Cell Count, White Cell Count, Total Leukocyte Count)

Metabolic (CGM summary report only — these come from the report's summary/overview page,
never from reading values off a chart):
- cgm_avg_glucose (Average Glucose, Mean Glucose)
- cgm_gmi (Glucose Management Indicator, GMI, Estimated A1C)
- cgm_variability (Glucose Variability, %CV, Coefficient of Variation)
- cgm_time_in_range (Time in Range, TIR, % in target range)
- cgm_time_above_range (Time Above Range, TAR, % above target range — sum "high" + "very high" if split)
- cgm_time_below_range (Time Below Range, TBR, % below target range — sum "low" + "very low" if split)

Rules:
- Report the value and unit EXACTLY as printed on the document (e.g. if it prints
  "Cholesterol, Total 5.8 mmol/L" report value 5.8, unit "mmol/L"; if it prints
  "Creatinine 88 umol/L" report value 88, unit "umol/L"). Do NOT convert units yourself —
  unit conversion is handled afterward in code from whatever unit you report.
- For CGM reports, only extract the named summary statistics — never estimate a value by
  reading position off a glucose trend chart or graph.
- Skip any key not present in the document. Do not guess or estimate a value.
- Do NOT report tumor markers (e.g. AFP, CEA, CA19-9, CA15.3, PSA), cancer screening
  results, or infectious disease serology (e.g. Hepatitis, EBV) even if present in the
  document — this platform is wellness-only, not diagnostic.
- Also look for the date this report is actually for -- usually printed as "Specimen
  Collected", "Collection Date", "Report Date", or similar. Report it as report_date in
  YYYY-MM-DD format. This is what a trend view uses to place this reading in time, so
  it matters that it's the date on the document, not today's date. Omit report_date
  entirely if no such date is printed anywhere on the document.

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
      report_date: {
        type: "string",
        description: "The specimen/collection/report date printed on the document, in YYYY-MM-DD format. Omit if not found.",
      },
    },
    required: ["results"],
  },
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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

  // Object-level authZ: storage_path is participant-controlled at insert time and
  // the service-role download below bypasses storage RLS, so enforce that the path
  // is inside the caller's own folder — otherwise a forged path could read another
  // participant's file.
  if (!fileRow.storage_path?.startsWith(`${participantId}/`)) {
    res.status(403).json({ error: "Not authorized for this file" });
    return;
  }

  // Extraction writes to biomarkers as the system, not the participant — biomarkers
  // are participant-read-only in RLS, so this step needs the service-role key.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Sex drives the reference range for a few markers (e.g. HDL: men < 1.03,
  // women < 1.29 mmol/L per NCEP ATP III / IDF) — see lib/ai/sexAwareRanges.ts.
  const { data: participant } = await serviceClient
    .from("participants")
    .select("sex")
    .eq("id", participantId)
    .maybeSingle();

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
  // Trust the file's actual bytes over its name/content-type (mobile uploads
  // mislabel constantly). Catch HEIC up front with a clear message rather than
  // letting Anthropic reject it with an opaque 400.
  const sniff = sniffMediaType(new Uint8Array(arrayBuffer));
  if (sniff.kind === "unsupported") {
    res.status(400).json({ error: UNSUPPORTED_FILE_MESSAGE });
    return;
  }
  const mediaType =
    sniff.kind === "supported" ? sniff.mediaType : detectMediaType(fileRow.storage_path, blob.type);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  let parsed: { results: Array<{ key: string; value: number; unit: string }>; report_date?: string };
  try {
    const content =
      mediaType === "application/pdf"
        ? ({ type: "document", source: { type: "base64", media_type: mediaType, data: base64 } } as const)
        : ({ type: "image", source: { type: "base64", media_type: mediaType as any, data: base64 } } as const);

    const message = await anthropic.messages.create({
      // Opus, not Sonnet -- misreading a lab value here silently corrupts a
      // pillar score and the AI draft built from it. max_tokens raised for
      // headroom since Opus 5 thinks by default and thinking + output share
      // one budget.
      model: "claude-opus-5",
      max_tokens: 8000,
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

  const measuredAt = parsed.report_date && ISO_DATE_RE.test(parsed.report_date) ? parsed.report_date : todayIso();

  const rows = (parsed.results ?? [])
    .filter((r) => LAB_CATALOG_BY_KEY[r.key] && typeof r.value === "number")
    .map((r) => {
      const entry = LAB_CATALOG_BY_KEY[r.key];
      const rawUnit = r.unit ?? entry.unit;
      const value = convertToTargetUnit(entry.key, r.value, rawUnit, entry.unit);
      // If the reported unit differs from our target and we have no converter for
      // it, we can't trust the value against our reference range (e.g. Lp(a) in
      // nmol/L scored against an mg/dL band reads as a false 0 and tanks the
      // pillar). Store it for admin review but leave the range null so it isn't
      // scored/flagged until a human confirms the unit.
      const convertible = isUnitConvertible(entry.key, rawUnit, entry.unit);
      const sexRange = sexAwareRange(entry.key, participant?.sex, entry);
      const ref_low = convertible ? sexRange.ref_low : null;
      const ref_high = convertible ? sexRange.ref_high : null;
      return {
        participant_id: participantId,
        pillar: entry.pillar,
        key: entry.key,
        label: entry.label,
        value,
        unit: convertible ? entry.unit : rawUnit,
        ref_low,
        ref_high,
        source: "lab_extract",
        status: "needs_review",
        flagged: convertible ? isMarkerFlagged(entry.key, value, ref_low as number, ref_high as number) : false,
        measured_at: measuredAt,
      };
    });

  if (rows.length > 0) {
    try {
      await writeBiomarkerReadings(serviceClient, rows, fileId);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed to write biomarker readings" });
      return;
    }
    await flagIfPastSignoff(serviceClient, participantId, "New lab report uploaded — biomarkers pending review");
    // Re-derive scores/bio age from the just-written values -- the capture
    // screen's generateDraft already fired (before this extraction finished), so
    // without this the upload wouldn't move the numbers until a later regen.
    await resyncDraftScores(serviceClient, participantId);
    // The full AI narrative/care-plan regen is deliberately NOT awaited here:
    // chaining a second Opus call inside this one function risks a 60s serverless
    // timeout (504), which the client reads as an upload failure even though the
    // biomarkers + numbers already landed above. The narrative is refreshed
    // separately -- the onboarding flow fires /api/generate-draft after each
    // upload, and the admin console has a "Regenerate AI draft" action.
  }

  await serviceClient.from("files").update({ extracted: true }).eq("id", fileId);

  res.status(200).json({ extracted: rows.map((r) => r.key) });
}
