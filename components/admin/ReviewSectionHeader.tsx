import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export interface ReviewSectionHeaderProps {
  /** Quiet, Oura-style overline label, rendered uppercase. */
  label: string;
  /** Optional right-aligned action (e.g. a small pressable / count). */
  action?: React.ReactNode;
  style?: ViewStyle;
}

// Admin-side twin of the participant `InsightsSectionHeader`: a single restrained
// uppercase overline in inkMuted, no icon circle, no tinted chrome — so the
// review console reads like a calm clinical report rather than a stack of heavy
// headline-titled cards. Matches the participant register exactly (bodySemiBold /
// fontSizes.overline / letterSpacing 0.8 / uppercase / inkMuted).
export function ReviewSectionHeader({ label, action, style }: ReviewSectionHeaderProps) {
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
