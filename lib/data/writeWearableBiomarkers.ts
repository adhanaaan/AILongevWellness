import type { SupabaseClient } from "@supabase/supabase-js";
import { WEARABLE_CATALOG_BY_KEY } from "../ai/wearableCatalog";
import { sexAwareRange } from "../ai/sexAwareRanges";
import { flagIfPastSignoff } from "./pipelineAttention";
import { resyncDraftScores } from "./resyncDraftScores";
import { regenerateDraft } from "../ai/draftGeneration";

/** A single normalized wearable/health reading, keyed to the biomarker vocabulary. */
export interface ParsedWearableValue {
  key: string;
  value: number;
}

/**
 * The one place raw wearable/health values become scored biomarkers. Shared by
 * every wearable ingestion path — the manual Apple Health export
 * (api/extract-wearables), the Terra aggregator webhook (api/terra-webhook), and
 * the health-export app webhook (api/health-ingest) — so they all normalize,
 * range-check, flag, and re-score through identical logic instead of drifting.
 *
 * Only keys present in WEARABLE_CATALOG are written (unknown metrics are dropped
 * rather than stored as junk). Returns the list of biomarker keys actually
 * written, so callers can report what landed.
 */
export async function writeWearableBiomarkers(
  serviceClient: SupabaseClient,
  participantId: string,
  values: ParsedWearableValue[],
  opts: { source: string; attentionReason: string }
): Promise<string[]> {
  const { data: participant } = await serviceClient
    .from("participants")
    .select("sex")
    .eq("id", participantId)
    .maybeSingle();

  const rows = values
    .filter((v) => WEARABLE_CATALOG_BY_KEY[v.key] && Number.isFinite(v.value))
    .map((v) => {
      const entry = WEARABLE_CATALOG_BY_KEY[v.key];
      const { ref_low, ref_high } = sexAwareRange(entry.key, participant?.sex, entry);
      return {
        participant_id: participantId,
        pillar: entry.pillar,
        key: entry.key,
        label: entry.label,
        value: v.value,
        unit: entry.unit,
        ref_low,
        ref_high,
        source: opts.source,
        status: "imported",
        flagged: v.value < ref_low || v.value > ref_high,
        updated_at: new Date().toISOString(),
      };
    });

  if (rows.length === 0) return [];

  const { error: upsertErr } = await serviceClient
    .from("biomarkers")
    .upsert(rows, { onConflict: "participant_id,key" });
  if (upsertErr) throw new Error(upsertErr.message);

  await flagIfPastSignoff(serviceClient, participantId, opts.attentionReason);

  // Never rewrite a clinician-signed card. After sign-off the participant-facing
  // scores are read straight from ai_draft, so resyncDraftScores would silently
  // recompute and overwrite them from new wearable readings — under a "Reviewed
  // & signed off by [name]" badge the clinician never approved. flagIfPastSignoff
  // (above) already raised needs_attention so the care team re-reviews the new
  // data instead. (regenerateDraft is already state-gated, but resyncDraftScores
  // is not — so guard here.)
  const { data: pipeline } = await serviceClient
    .from("pipeline")
    .select("state")
    .eq("participant_id", participantId)
    .maybeSingle();
  const signedOff = pipeline?.state === "signed" || pipeline?.state === "delivered";

  if (!signedOff) {
    // Re-derive scores/bio age from the just-written values, then re-run the full
    // draft (AI narrative too) best-effort — same as the manual-export path.
    await resyncDraftScores(serviceClient, participantId);
    try {
      await regenerateDraft(serviceClient, participantId);
    } catch {
      /* numbers already resynced above */
    }
  }

  return rows.map((r) => r.key);
}
