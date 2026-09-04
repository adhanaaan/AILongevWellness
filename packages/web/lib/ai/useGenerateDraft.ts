import { useState, useCallback } from "react";
import { generateDraft, generateCarePlan } from "@/lib/ai/client";
import { useAuth } from "@/lib/auth/AuthProvider";

export type GenerateDraftStatus = "idle" | "generating" | "error";

/**
 * "draft" runs full generation (blocked on a signed card). "carePlan" backfills
 * only the care plan onto an already-delivered card that never got one.
 */
export type GenerateMode = "draft" | "carePlan";

/**
 * Drives on-demand AI-draft generation with VISIBLE status and errors — the
 * opposite of the fire-and-forget `generateDraft(...).catch(() => {})` used
 * during onboarding, which swallows every failure and leaves a participant on
 * the generic fallback with no signal anything broke. `generate()` resolves to
 * `true` on success (the caller should then reload its data to pick up the new
 * draft) and surfaces the endpoint's real error message on failure so the reason
 * a plan didn't generate is actually diagnosable.
 */
export function useGenerateDraft(participantId: string | null) {
  const { session } = useAuth();
  const [status, setStatus] = useState<GenerateDraftStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (mode: GenerateMode = "draft"): Promise<boolean> => {
      if (!participantId || !session?.access_token) return false;
      setStatus("generating");
      setError(null);
      try {
        if (mode === "carePlan") {
          await generateCarePlan(session.access_token, participantId);
        } else {
          await generateDraft(session.access_token, participantId);
        }
        setStatus("idle");
        return true;
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "Generation failed — please try again.");
        setStatus("error");
        return false;
      }
    },
    [participantId, session?.access_token]
  );

  return { status, error, generate };
}
