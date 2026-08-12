import React, { useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";

export interface FadeInViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * The same fade + rise entrance already used in AvaPromo and SnapshotPending
 * (onboarding's pre-review states) -- pulled out here so the main tabs
 * (Insights, Care Plan, etc.) can pick up the identical polish instead of
 * appearing instantly with no transition, which read as a jump cut next to
 * the onboarding screens that already had this.
 */
export function FadeInView({ children, style }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
