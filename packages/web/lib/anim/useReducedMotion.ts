import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

/**
 * Tracks the platform's "reduce motion" preference so entrance/count-up/draw-on
 * animations can be skipped (jumped straight to their final state) for users who
 * ask for less motion. On native this reads `AccessibilityInfo` (with a live
 * listener); on web it also honors the `prefers-reduced-motion` media query,
 * which `AccessibilityInfo` on react-native-web does not always surface.
 *
 * Returns `false` until the async check resolves — callers must still ensure
 * content ENDS in its final visible state whether motion runs or is skipped.
 */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setReduce(v);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      if (mounted) setReduce(v);
    });

    let mq: MediaQueryList | undefined;
    let mqHandler: ((e: MediaQueryListEvent) => void) | undefined;
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.matchMedia === "function") {
      try {
        mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (mq.matches) setReduce(true);
        mqHandler = (e: MediaQueryListEvent) => {
          if (mounted) setReduce(e.matches);
        };
        mq.addEventListener?.("change", mqHandler);
      } catch {
        // matchMedia unavailable — fall back to the AccessibilityInfo value.
      }
    }

    return () => {
      mounted = false;
      sub?.remove?.();
      if (mq && mqHandler) mq.removeEventListener?.("change", mqHandler);
    };
  }, []);

  return reduce;
}
