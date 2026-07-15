import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  fontSizes,
  fontWeights,
  radii,
  shadows,
  spacing,
} from "@/lib/theme/tokens";

export interface BiologicalAgeHeroProps {
  bioAge: number;
  chronoAge: number;
}

export function BiologicalAgeHero({ bioAge, chronoAge }: BiologicalAgeHeroProps) {
  const delta = chronoAge - bioAge;
  const deltaLabel = delta >= 0 ? `−${delta} years` : `+${Math.abs(delta)} years`;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Your biological age</Text>
      <Text style={styles.bioAge}>{bioAge}</Text>
      <Text style={styles.chronoAge}>{chronoAge}</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{deltaLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.sageTint,
    borderRadius: radii.lg,
    padding: spacing["2xl"],
    alignItems: "center",
    ...shadows.card,
  },
  label: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.medium,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  bioAge: {
    fontSize: fontSizes.display,
    fontWeight: fontWeights.extrabold,
    color: colors.charcoal,
    lineHeight: fontSizes.display * 1.1,
  },
  chronoAge: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.regular,
    color: colors.inkMuted,
    textDecorationLine: "line-through",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  pill: {
    backgroundColor: colors.sage,
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  pillText: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
});
