import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Sparkles } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontSizes, lineHeights, radii, spacing } from "@/lib/theme/tokens";

export interface SnapshotSummaryCardProps {
  /** One-line plain-English takeaway, e.g. from buildPillarNarrative(). */
  narrative: string;
}

// The plain-English "am I okay?" answer is the emotional anchor of the Insights
// screen, so it gets an elevated insight card with a leading icon rather than
// floating as centered body text (mirrors how Bevel/Oura present their headline
// takeaway). Still sits directly under the biological-age hero, preserving the
// deliberate narrative-led hierarchy.
export function SnapshotSummaryCard({ narrative }: SnapshotSummaryCardProps) {
  return (
    <Card tinted padding="md" style={styles.card}>
      <View style={styles.iconCircle}>
        <Sparkles size={16} color={colors.sageDark} />
      </View>
      <Text style={styles.text}>{narrative}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 0,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    fontSize: fontSizes.bodyMd,
    lineHeight: lineHeights.bodyMd,
    color: colors.charcoal,
  },
});
