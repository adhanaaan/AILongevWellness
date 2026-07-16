import React from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { gradientOrbs } from "@/lib/theme/tokens";

export type OrbTone = keyof typeof gradientOrbs;

export interface GradientOrbProps {
  tone?: OrbTone;
  size?: number;
  style?: ViewStyle;
}

export function GradientOrb({ tone = "teal", size = 240, style }: GradientOrbProps) {
  const [inner, outer] = gradientOrbs[tone];
  const gradientId = `orb-${tone}`;

  return (
    <Svg
      width={size}
      height={size}
      style={[styles.orb, { width: size, height: size }, style]}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={inner} />
          <Stop offset="100%" stopColor={outer} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={size} height={size} fill={`url(#${gradientId})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
  },
});
