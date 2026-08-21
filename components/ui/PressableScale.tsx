import React, { useRef } from "react";
import { Animated, Pressable, type PressableProps, type ViewStyle } from "react-native";
import { useReducedMotion } from "@/lib/anim/useReducedMotion";
import { haptic, type HapticStyle } from "@/lib/anim/haptics";

export interface PressableScaleProps extends Omit<PressableProps, "style" | "children"> {
  children?: React.ReactNode;
  /** Style for the animated inner view (this is what scales). */
  style?: ViewStyle | ViewStyle[];
  /** Style for the outer Pressable — use for layout/positioning (e.g. absolute). */
  containerStyle?: ViewStyle | ViewStyle[];
  /** How far to scale down while pressed. Default 0.96 (subtle, calm). */
  activeScale?: number;
  /** Opacity while pressed. Default 0.9. */
  activeOpacity?: number;
  /** Haptic fired on press. Set null to disable. Default "light". */
  haptics?: HapticStyle | null;
}

/**
 * A Pressable with restrained press feedback — a small scale + opacity dip on
 * press, plus an optional haptic (native only, no-op on web). Honors reduce-
 * motion by skipping the scale entirely. Forwards all Pressable props, so
 * accessibilityRole / accessibilityLabel and onPress pass straight through.
 */
export function PressableScale({
  children,
  style,
  containerStyle,
  activeScale = 0.96,
  activeOpacity = 0.9,
  haptics = "light",
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toScale: number, toOpacity: number) => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, speed: 40, bounciness: 0 }),
      Animated.timing(opacity, { toValue: toOpacity, duration: 90, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPress={(e) => {
        if (haptics) haptic(haptics);
        onPress?.(e);
      }}
      onPressIn={(e) => {
        animateTo(activeScale, activeOpacity);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1, 1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity }]}>{children}</Animated.View>
    </Pressable>
  );
}
