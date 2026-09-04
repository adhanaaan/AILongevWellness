import type { SupabaseClient } from "@supabase/supabase-js";

export interface BiomarkerReadingInput {
  participant_id: string;
  pillar: string;
  key: string;
  label: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  source: string;
  status: string;
  flagged: boolean;
  /** The real measurement date (e.g. the lab's specimen/report date), YYYY-MM-DD. */
  measured_at: string;
}

/**
 * Writes every extracted value to biomarker_readings -- append-only history,
 * never overwritten -- and separately promotes it into the "current"
 * biomarkers snapshot that scoring/generate-draft actually reads. A reading
 * only gets promoted if its measured_at is the same age or newer than
 * whatever's already current, so uploading an old backfilled report after a
 * more recent one can't regress the score-driving value. Shared by
 * extract-lab.ts and extract-body-comp.ts so both write history the same way.
 */
export async function writeBiomarkerReadings(
  serviceClient: SupabaseClient,
  rows: BiomarkerReadingInput[],
  fileId: string | null
): Promise<void> {
  if (rows.length === 0) return;

  const participantId = rows[0].participant_id;
  const keys = rows.map((r) => r.key);
  const { data: existing, error: fetchErr } = await serviceClient
    .from("biomarkers")
    .select("key, measured_at")
    .eq("participant_id", participantId)
    .in("key", keys);
  if (fetchErr) throw new Error(fetchErr.message);
  const existingDateByKey = new Map<string, string | null>(
    (existing ?? []).map((e: { key: string; measured_at: string | null }) => [e.key, e.measured_at])
  );

  const readingRows = rows.map((r) => ({
    participant_id: r.participant_id,
    key: r.key,
    value: r.value,
    unit: r.unit,
    ref_low: r.ref_low,
    ref_high: r.ref_high,
    source: r.source,
    measured_at: r.measured_at,
    file_id: fileId,
  }));

  const { error: historyErr } = await serviceClient
    .from("biomarker_readings")
    .upsert(readingRows, { onConflict: "participant_id,key,file_id" });
  if (historyErr) throw new Error(historyErr.message);

  const currentRows = rows
    .filter((r) => {
      const existingDate = existingDateByKey.get(r.key);
      return !existingDate || r.measured_at >= existingDate;
    })
    .map((r) => ({
      participant_id: r.participant_id,
      pillar: r.pillar,
      key: r.key,
      label: r.label,
      value: r.value,
      unit: r.unit,
      ref_low: r.ref_low,
      ref_high: r.ref_high,
      source: r.source,
      status: r.status,
      flagged: r.flagged,
      measured_at: r.measured_at,
      updated_at: new Date().toISOString(),
    }));

  if (currentRows.length > 0) {
    const { error: upsertErr } = await serviceClient
      .from("biomarkers")
      .upsert(currentRows, { onConflict: "participant_id,key" });
    if (upsertErr) throw new Error(upsertErr.message);
  }
}
