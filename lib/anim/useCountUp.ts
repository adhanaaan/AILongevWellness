import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { useReducedMotion } from "./useReducedMotion";

export interface CountUpOptions {
  /** Total run time in ms. Default 800. */
  duration?: number;
  /** When false, the value is shown immediately with no animation. Default true. */
  enabled?: boolean;
}

/**
 * Eases a number up from 0 to `target` once on mount (and whenever `target`
 * changes), returning the current whole-number value to render. Honors reduce-
 * motion (jumps straight to `target`) and always settles on the exact target
 * even if the animation is interrupted.
 */
export function useCountUp(target: number, options: CountUpOptions = {}): number {
  const { duration = 800, enabled = true } = options;
  const reduceMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;
  // Start at 0 so the very first paint doesn't flash the final value before the
  // count-up begins; the effect corrects to `target` immediately when motion is
  // reduced/disabled.
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion || !enabled) {
      anim.setValue(target);
      setDisplay(target);
      return;
    }

    anim.setValue(0);
    setDisplay(0);
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    const run = Animated.timing(anim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      // Driving a JS listener that setStates a <Text>, so this cannot be native.
      useNativeDriver: false,
    });
    run.start(({ finished }) => {
      if (finished) setDisplay(target);
    });

    return () => {
      anim.removeListener(id);
      run.stop();
      // Guarantee the final value even if unmounted mid-flight.
      setDisplay(target);
    };
  }, [target, duration, enabled, reduceMotion, anim]);

  return display;
}
