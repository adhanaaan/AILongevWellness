import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export interface InsightsSectionHeaderProps {
  /** Quiet Oura-style overline label, rendered uppercase. */
  label: string;
  /** Optional right-aligned action (e.g. a "See all" pressable). */
  action?: React.ReactNode;
  style?: ViewStyle;
}

// Calm-clinical section header: a single restrained uppercase overline in
// inkMuted, no icon circle, no tinted chrome. Replaces the sage icon-circle +
// title pattern so the Insights tab reads like a medical report, not a
// consumer dashboard.
export function InsightsSectionHeader({ label, action, style }: InsightsSectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.inkMuted,
  },
  action: {
    marginLeft: spacing.md,
  },
});
