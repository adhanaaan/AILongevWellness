import React from "react";
import { Text, StyleSheet, type TextStyle } from "react-native";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export interface CarePlanSectionLabelProps {
  children: React.ReactNode;
  style?: TextStyle;
}

// A quiet uppercase overline used as the section header throughout the Care Plan
// tab and its category drill-down. Deliberately restrained (small, letter-spaced,
// muted) so sections read as calm dividers in a clinical protocol rather than
// loud titles competing with the content beneath them.
export function CarePlanSectionLabel({ children, style }: CarePlanSectionLabelProps) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.inkMuted,
    marginTop: spacing["2xl"],
    marginBottom: spacing.md,
  },
});
