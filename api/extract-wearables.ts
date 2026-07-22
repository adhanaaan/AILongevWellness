import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { parseAppleHealthExport } from "../lib/ai/appleHealthParser";
import { WEARABLE_CATALOG_BY_KEY } from "../lib/ai/wearableCatalog";
import { BUCKET_BY_KIND } from "../lib/data/storageBuckets";

// This is a Vercel serverless function — see vercel.json's rewrite excluding /api/*
// from the SPA catch-all.
//
// Apple Health has no cloud API — the only way to get this data is the participant
// manually exporting it on their phone (Health app -> profile icon -> Export All
// Health Data) and uploading the resulting zip here. This parses the export.xml
// inside it deterministically (not via an LLM — HealthKit's record format is
// structured and stable, so a real parser is both cheaper and more accurate than
// asking a model to read raw XML). Once real biomarkers land from this, the
// existing /api/generate-draft.ts pipeline picks them up automatically for
// scoring and the Claude-written narrative — no separate AI call needed here.

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

  const { participantId, fileId } = req.body ?? {};
  if (!participantId || !fileId) {
    res.status(400).json({ error: "participantId and fileId are required" });
    return;
  }

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

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const bucket = BUCKET_BY_KIND[fileRow.kind as keyof typeof BUCKET_BY_KIND];
  const { data: blob, error: downloadErr } = await serviceClient.storage
    .from(bucket)
    .download(fileRow.storage_path);
  if (downloadErr || !blob) {
    res.status(500).json({ error: downloadErr?.message ?? "Could not download file" });
    return;
  }

  let xml: string;
  try {
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const entryName = Object.keys(zip.files).find(
      (name) => /export\.xml$/i.test(name) && !/export_cda\.xml$/i.test(name)
    );
    if (!entryName) {
      res.status(400).json({
        error: "Couldn't find export.xml in the uploaded file — make sure you selected the zip from Health app's \"Export All Health Data\".",
      });
      return;
    }
    xml = await zip.files[entryName].async("string");
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Couldn't read the uploaded zip file" });
    return;
  }

  const parsedValues = parseAppleHealthExport(xml);

  const rows = parsedValues
    .filter((v) => WEARABLE_CATALOG_BY_KEY[v.key])
    .map((v) => {
      const entry = WEARABLE_CATALOG_BY_KEY[v.key];
      return {
        participant_id: participantId,
        pillar: entry.pillar,
        key: entry.key,
        label: entry.label,
        value: v.value,
        unit: entry.unit,
        ref_low: entry.ref_low,
        ref_high: entry.ref_high,
        source: "wearable",
        status: "imported",
        flagged: v.value < entry.ref_low || v.value > entry.ref_high,
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
