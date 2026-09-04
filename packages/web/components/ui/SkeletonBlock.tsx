import React, { useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";
import { colors, radii } from "@/lib/theme/tokens";

export interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * A pulsing placeholder rectangle -- shaped to match the real content it
 * stands in for (a title bar, a hero card, a pillar circle), the pattern
 * every reference app (Grab, AllTrails, Careem) uses for a first load,
 * rather than a generic centered spinner that gives no sense of what's
 * actually loading or where it'll land.
 */
export function SkeletonBlock({ width = "100%", height = 16, radius = radii.sm, style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.surfaceMuted, opacity },
        style,
      ]}
    />
  );
}
