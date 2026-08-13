import { useCallback } from "react";
import { useRouter } from "expo-router";

// Monotonic counter so two taps within the same millisecond still produce
// distinct ids — Date.now() alone can collide on a fast double-tap.
let seq = 0;

/**
 * Navigate to the AVA tab pre-seeded with a question, so "ask AVA about this"
 * works from anywhere in the app (a pillar score, a biomarker, a care-plan
 * item). Every call carries a fresh `qid` nonce: the AVA screen re-seeds on each
 * new nonce, so tapping a second Ask-AVA link still fires even though the AVA
 * tab stays mounted after its first visit (React Navigation keeps tab screens
 * alive) — without the nonce, only the very first seeded question would ever run.
 */
export function useAskAva() {
  const router = useRouter();
  return useCallback(
    (question: string) => {
      seq += 1;
      router.push({
        pathname: "/(tabs)/ava",
        params: { q: question, qid: `${Date.now()}-${seq}` },
      });
    },
    [router]
  );
}
