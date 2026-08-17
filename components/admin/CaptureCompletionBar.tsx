import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing, teal } from "@/lib/theme/tokens";

interface CaptureCompletionBarProps {
  value: number;
}

// Calm-clinical capture meter: a single thin hairline track with a muted
// percentage. Complete reads teal; anything short reads in a quiet neutral
// fill rather than an alarmist terracotta — incomplete capture is a normal
// state on this console, not a warning.
export function CaptureCompletionBar({ value }: CaptureCompletionBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const complete = clamped >= 100;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: complete ? colors.teal : teal[300],
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.percentage,
          { color: complete ? colors.tealDark : colors.inkMuted },
        ]}
      >
        {Math.round(clamped)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.full,
  },
  percentage: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    minWidth: 34,
    textAlign: "right",
  },
});
