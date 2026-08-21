import React, { useEffect, useRef } from "react";
import { Animated, Easing, View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors, fontFamilies, fontSizes, spacing, teal } from "@/lib/theme/tokens";
import { useReducedMotion } from "@/lib/anim/useReducedMotion";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ScoreRingProps {
  value: number;
  label: string;
  status: "good" | "monitor";
  size?: number;
}

// A premium score ring: a faint status-tinted track under a rounded, gradient
// progress stroke (light → brand at the leading edge, à la Replika's onboarding
// ring), with a bold display-font value centered in the well like Alma's food
// scores. Stroke and type scale with `size` so the same component reads well at
// the 56px preview trio and the larger card. Public API is unchanged.
export function ScoreRing({
  value,
  label,
  status,
  size = 88,
}: ScoreRingProps) {
  const gradientId = React.useId();
  const strokeWidth = Math.max(5, Math.round(size * 0.1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const strokeDashoffset = circumference * (1 - clamped / 100);

  // Sweep the arc from empty to its value on mount (once). Reduce-motion jumps
  // straight to the final offset. The 0→1 progress interpolates to the offset.
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      // Animating an SVG stroke prop, which the native driver can't handle.
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, reduceMotion, clamped]);
  const animatedOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, strokeDashoffset],
  });

  const isGood = status === "good";
  // Gradient sweeps a lighter tint into the brand hue so the stroke has depth
  // rather than reading as a flat arc; text takes the darker, most-legible end.
  const gradFrom = isGood ? teal[300] : colors.terracotta;
  const gradTo = isGood ? colors.sage : colors.terracottaInk;
  const trackColor = isGood ? colors.sageTint : colors.terracottaTint;
  const valueColor = gradTo;

  const valueFontSize = Math.round(size * 0.34);

  const statusWord = isGood ? "on track" : "monitor";

  return (
    <View style={styles.container}>
      <View
        style={{ width: size, height: size }}
        accessibilityRole="image"
        accessibilityLabel={`${label} ${clamped} out of 100, ${statusWord}`}
      >
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradFrom} />
              <Stop offset="1" stopColor={gradTo} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={animatedOffset}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={[styles.valueContainer, { width: size, height: size }]}>
          <Text style={[styles.value, { color: valueColor, fontSize: valueFontSize }]}>
            {clamped}
          </Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  valueContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontFamily: fontFamilies.displayBold,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
});
