import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { BODY_COMP_CATALOG_BY_KEY } from "../lib/ai/bodyCompCatalog";
import { BUCKET_BY_KIND } from "../lib/data/storageBuckets";
import { flagIfPastSignoff } from "../lib/data/pipelineAttention";

// This is a Vercel serverless function — see vercel.json's rewrite, which
// excludes /api/* from the SPA catch-all so requests here reach this file
// instead of index.html. Mirrors api/extract-lab.ts's structure exactly.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const EXTRACTION_PROMPT = `You are extracting results from a body composition scan printout (e.g. InBody,
Tanita, DEXA, or a retreat kiosk scan). This is an image or PDF of the scan's result sheet.

Only report values for these exact keys (common aliases a real printout might use are
listed in parentheses — match on meaning, not exact wording):

- bmi (BMI, Body Mass Index)
- body_fat_pct (Body Fat %, PBF, Percent Body Fat, Body Fat Mass %)
- visceral_fat (Visceral Fat Level, Visceral Fat Area, VFL)
- waist_hip_ratio (Waist-Hip Ratio, WHR)

Rules:
- Report the value exactly as printed. These are all unit-consistent across scan brands
  (BMI in kg/m², body fat as a plain %, visceral fat as a plain level/index number,
  waist-hip ratio as a plain ratio) so no unit conversion is needed.
- Skip any key not present in the document. Do not guess or estimate a value, and never
  read a value off a body silhouette diagram or chart — only from printed numbers.
- Do NOT report anything else on the sheet not in this list (e.g. segmental lean mass
  breakdowns, muscle-fat analysis grades, or InBody's proprietary "scores") — this
  platform only tracks the four markers above.

Call report_body_comp_values with what you found.`;

// Forcing a tool call instead of asking Claude to free-write a JSON string —
// same reasoning as extract-lab.ts.
const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "report_body_comp_values",
  description: "Report the body composition values found in the document.",
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
          },
          required: ["key", "value"],
        },
      },
    },
    required: ["results"],
  },
};

// Same reasoning as extract-lab.ts's detectMediaType: trust the extension we
// control over whatever content-type Supabase Storage happens to echo back.
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

  // Extraction writes to biomarkers as the system, not the participant —
  // biomarkers are participant-read-only in RLS, so this needs the service-role key.
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

  let parsed: { results: Array<{ key: string; value: number }> };
  try {
    const content =
      mediaType === "application/pdf"
        ? ({ type: "document", source: { type: "base64", media_type: mediaType, data: base64 } } as const)
        : ({ type: "image", source: { type: "base64", media_type: mediaType as any, data: base64 } } as const);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: "report_body_comp_values" },
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
    .filter((r) => BODY_COMP_CATALOG_BY_KEY[r.key] && typeof r.value === "number")
    .map((r) => {
      const entry = BODY_COMP_CATALOG_BY_KEY[r.key];
      return {
        participant_id: participantId,
        pillar: entry.pillar,
        key: entry.key,
        label: entry.label,
        value: r.value,
        unit: entry.unit,
        ref_low: entry.ref_low,
        ref_high: entry.ref_high,
        source: "body_comp",
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
    await flagIfPastSignoff(serviceClient, participantId, "New body composition scan uploaded — biomarkers pending review");
  }

  await serviceClient.from("files").update({ extracted: true }).eq("id", fileId);

  res.status(200).json({ extracted: rows.map((r) => r.key) });
}
