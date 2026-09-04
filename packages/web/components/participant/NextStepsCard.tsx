import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, lineHeights, radii, spacing } from "@/lib/theme/tokens";

export interface NextStepsCardProps {
  points: string[];
}

// Calm-clinical register: a quiet overline heading and a spaced list of
// discussion points, each led by a small sage dot instead of a bullet glyph.
export function NextStepsCard({ points }: NextStepsCardProps) {
  if (points.length === 0) return null;

  return (
    <Card padding="lg">
      <Text style={styles.overline}>Bring up with your doctor</Text>

      <View style={styles.list}>
        {points.map((point, index) => (
          <View key={index} style={styles.bulletRow}>
            <View style={styles.dot} />
            <Text style={styles.bulletText}>{point}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  overline: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.inkMuted,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.sage,
    marginTop: 9,
    marginRight: spacing.md,
  },
  bulletText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    flex: 1,
    lineHeight: lineHeights.bodyMd,
  },
});
