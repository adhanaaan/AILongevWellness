import React, { useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";
import { useReducedMotion } from "@/lib/anim/useReducedMotion";

export interface FadeInViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Delay before the entrance starts, in ms. Enables staggered reveals. */
  delay?: number;
  /** Entrance duration in ms. Default 350. */
  duration?: number;
  /** Distance in px the content rises from. Default 12. */
  offsetY?: number;
}

/**
 * The same fade + rise entrance already used in AvaPromo and SnapshotPending
 * (onboarding's pre-review states) -- pulled out here so the main tabs
 * (Insights, Care Plan, etc.) can pick up the identical polish instead of
 * appearing instantly with no transition, which read as a jump cut next to
 * the onboarding screens that already had this.
 *
 * `delay`/`duration` let callers stagger several of these for a sequenced
 * reveal. Reduce-motion is honored: the content is placed in its final state
 * immediately with no animation. Content always ends fully visible.
 */
export function FadeInView({ children, style, delay = 0, duration = 350, offsetY = 12 }: FadeInViewProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offsetY)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(offsetY);
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity, translateY, delay, duration, offsetY, reduceMotion]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
