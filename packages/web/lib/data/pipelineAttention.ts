import type { SupabaseClient } from "@supabase/supabase-js";

const NEEDS_REVIEW_STATES = new Set(["signed", "delivered"]);

/**
 * A participant can upload new lab/wearable data at any pipeline state — but once
 * a card has already been signed off or delivered, silently writing new biomarkers
 * behind it would leave the care team unaware. This flags the existing
 * needs_attention overlay (never touches pipeline.state itself, per the "sacred"
 * state machine) so it surfaces in the admin review queue without reverting or
 * regenerating the already-delivered card.
 */
export async function flagIfPastSignoff(
  serviceClient: SupabaseClient,
  participantId: string,
  reason: string
): Promise<void> {
  const { data: pipeline } = await serviceClient
    .from("pipeline")
    .select("state")
    .eq("participant_id", participantId)
    .maybeSingle();
  if (pipeline && NEEDS_REVIEW_STATES.has(pipeline.state)) {
    await serviceClient
      .from("pipeline")
      .update({ needs_attention: true, attention_reason: reason })
      .eq("participant_id", participantId);
  }
}
