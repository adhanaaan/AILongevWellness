import type { SupabaseClient } from "@supabase/supabase-js";
import type { Biomarker } from "../types/db";
import {
  computePillarScores,
  computeBiologicalAge,
  computeMissingBiomarkers,
  computeOutOfRange,
} from "../ai/scoring";
import { computePhenoAge } from "../ai/phenoAge";

/**
 * Re-derive the *deterministic* parts of the AI draft — pillar scores,
 * biological age, the missing-biomarker list, and the out-of-range list — from
 * the participant's current biomarker snapshot, and write them back to ai_draft.
 *
 * Every server-side biomarker-writing path MUST call this after it writes, or
 * the numbers on the Insights card go stale. The capture screens fire
 * generateDraft the instant a file is uploaded — *before* extraction has written
 * anything (extraction is fire-and-forget and takes seconds) — so without this
 * the freshly-uploaded values never move the score until some unrelated later
 * regen. SupabaseRepository.updateBiomarker (the admin single-value edit) already
 * does this same recompute inline; this is that logic, shared for the extraction
 * endpoints (lab / body-comp / wearables / ReCOGnAIze).
 *
 * Deterministic only: it never touches the AI-written narrative
 * (key_contributors / suggested_focus / discussion_points / care_plan), which a
 * full generateDraft still owns. Safe to run whenever biomarkers change — it's a
 * pure function of the current snapshot, no AI call. No-ops if no draft exists
 * yet (nothing to update until the first draft is generated).
 *
 * No-ops once the card is signed/delivered: post-sign-off the participant-facing
 * scores are read straight from ai_draft, so recomputing them here from
 * newly-arrived biomarkers (a late extraction, a wearable sync, a re-upload)
 * would silently overwrite doctor-signed numbers under a "Reviewed & signed off"
 * badge. Every caller runs flagIfPastSignoff first, which raises needs_attention
 * so the care team re-reviews instead. (A deliberate admin biomarker edit uses a
 * separate inline recompute in SupabaseRepository.updateBiomarker, not this — so
 * intentional edits still flow through.)
 */
export async function resyncDraftScores(
  serviceClient: SupabaseClient,
  participantId: string
): Promise<void> {
  const { data: draft, error: draftErr } = await serviceClient
    .from("ai_draft")
    .select("chronological_age")
    .eq("participant_id", participantId)
    .maybeSingle();
  if (draftErr) throw new Error(draftErr.message);
  if (!draft) return;

  const { data: pipeline } = await serviceClient
    .from("pipeline")
    .select("state")
    .eq("participant_id", participantId)
    .maybeSingle();
  if (pipeline?.state === "signed" || pipeline?.state === "delivered") return;

  // Also skip once EITHER stage has signed (state can still be "gp_review" under
  // async GP/TCM review). Recomputing numbers here would overwrite values a
  // reviewer has already put their name to; flagIfPastSignoff (run by every
  // caller first) raises needs_attention so the care team re-reviews instead.
  const { data: signedReviews } = await serviceClient
    .from("reviews")
    .select("signed_at")
    .eq("participant_id", participantId)
    .not("signed_at", "is", null)
    .limit(1);
  if (signedReviews && signedReviews.length > 0) return;

  const { data: biomarkers, error: bmErr } = await serviceClient
    .from("biomarkers")
    .select("*")
    .eq("participant_id", participantId);
  if (bmErr) throw new Error(bmErr.message);
  const rows = (biomarkers ?? []) as Biomarker[];

  const scores = computePillarScores(rows);
  const biological_age =
    computePhenoAge(rows, draft.chronological_age) ?? computeBiologicalAge(scores, draft.chronological_age);

  const { error: updateErr } = await serviceClient
    .from("ai_draft")
    .update({
      scores,
      biological_age,
      missing_biomarkers: computeMissingBiomarkers(rows),
      out_of_range: computeOutOfRange(rows),
    })
    .eq("participant_id", participantId);
  if (updateErr) throw new Error(updateErr.message);
}
