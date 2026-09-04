import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface BiomarkerSummaryBarProps {
  inRange: number;
  outOfRange: number;
  notCaptured: number;
}

// Superpower's "56 optimal / 36 normal / 13 out of range" header, mapped to the
// categories our data actually supports: markers are binary (flagged or not), so
// the honest split is In range / Out of range / Not captured. The last segment
// doubles as a "finish capturing" nudge. Column numbers are tinted to match the
// segmented bar beneath, so the two read as one unit without needing a legend.
export function BiomarkerSummaryBar({ inRange, outOfRange, notCaptured }: BiomarkerSummaryBarProps) {
  const total = inRange + outOfRange + notCaptured;

  const stats = [
    { label: "Total", value: total, color: colors.charcoal },
    { label: "In range", value: inRange, color: colors.sage },
    { label: "Out of range", value: outOfRange, color: colors.terracottaInk },
    { label: "Not captured", value: notCaptured, color: colors.inkMuted },
  ];

  const segments = [
    { value: inRange, color: colors.sage },
    { value: outOfRange, color: colors.terracotta },
    { value: notCaptured, color: colors.borderStrong },
  ].filter((s) => s.value > 0);

  return (
    <Card padding="lg" style={styles.card}>
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.bar} accessibilityRole="image" accessibilityLabel={`${inRange} in range, ${outOfRange} out of range, ${notCaptured} not captured`}>
        {segments.map((s, i) => (
          <View key={i} style={[styles.segment, { flex: s.value, backgroundColor: s.color }]} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {},
  statsRow: {
    flexDirection: "row",
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineSm,
    fontWeight: fontWeights.bold,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    marginTop: 2,
  },
  bar: {
    flexDirection: "row",
    gap: 3,
    marginTop: spacing.lg,
    height: 10,
  },
  segment: {
    borderRadius: radii.full,
    minWidth: 6,
  },
});
