import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ProgressBar } from "@/components/ui";
import { colors, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

interface CaptureCompletionBarProps {
  value: number;
}

export function CaptureCompletionBar({ value }: CaptureCompletionBarProps) {
  const tone = value >= 100 ? "sage" : "terracotta";

  return (
    <View style={styles.container}>
      <View style={styles.barWrapper}>
        <ProgressBar value={value} tone={tone} />
      </View>
      <Text
        style={[
          styles.percentage,
          { color: tone === "sage" ? colors.sageDark : colors.terracottaInk },
        ]}
      >
        {Math.round(value)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  barWrapper: {
    flex: 1,
  },
  percentage: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    minWidth: 40,
    textAlign: "right",
  },
});
