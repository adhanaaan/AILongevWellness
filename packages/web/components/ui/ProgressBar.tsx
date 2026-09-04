import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, radii } from "@/lib/theme/tokens";

export type ProgressBarTone = "teal" | "warning" | "sage" | "terracotta";

export interface ProgressBarProps {
  value: number; // 0-100
  tone?: ProgressBarTone;
}

const toneColors: Record<ProgressBarTone, string> = {
  teal: colors.teal,
  warning: colors.warning,
  sage: colors.teal,
  terracotta: colors.warning,
};

export function ProgressBar({ value, tone = "teal" }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: toneColors[tone],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.full,
  },
});
