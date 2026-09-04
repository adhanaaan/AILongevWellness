import React from "react";
import { Text, StyleSheet } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, lineHeights, spacing } from "@/lib/theme/tokens";

export interface SnapshotSummaryCardProps {
  /** One-line plain-English takeaway, e.g. from buildPillarNarrative(). */
  narrative: string;
}

// The plain-English "am I okay?" answer is the emotional anchor of the Insights
// screen. Calm-clinical register: a quiet overline over a slightly larger read,
// on a soft tinted card — no icon-circle chrome. Sits directly under the
// biological-age hero, preserving the deliberate narrative-led hierarchy.
export function SnapshotSummaryCard({ narrative }: SnapshotSummaryCardProps) {
  return (
    <Card tinted padding="lg" style={styles.card}>
      <Text style={styles.overline}>In summary</Text>
      <Text style={styles.text}>{narrative}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0,
  },
  overline: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.sageDark,
    marginBottom: spacing.sm,
  },
  text: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    lineHeight: lineHeights.bodyLg,
    color: colors.charcoal,
  },
});
