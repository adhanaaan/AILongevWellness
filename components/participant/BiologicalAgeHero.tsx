import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientOrb } from "@/components/ui/GradientOrb";
import {
  colors,
  fontFamilies,
  fontSizes,
  radii,
  spacing,
} from "@/lib/theme/tokens";

export interface BiologicalAgeHeroProps {
  bioAge: number;
  chronoAge: number;
}

// A tick-based ruler with two markers close together (a small delta) reads
// as cluttered on a phone-width card -- a plain side-by-side comparison
// scales cleanly at any delta and reads at a glance, so this replaces it.
function AgeCompareRow({ bioAge, chronoAge }: { bioAge: number; chronoAge: number }) {
  return (
    <View style={styles.compareRow}>
      <View style={styles.compareItem}>
        <Text style={styles.compareValue}>{chronoAge}</Text>
        <Text style={styles.compareLabel}>Your age</Text>
      </View>
      <ArrowRight size={18} color={colors.inkOnDarkMuted} />
      <View style={styles.compareItem}>
        <Text style={[styles.compareValue, styles.compareValueBio]}>{bioAge}</Text>
        <Text style={styles.compareLabel}>Biological</Text>
      </View>
    </View>
  );
}

export function BiologicalAgeHero({ bioAge, chronoAge }: BiologicalAgeHeroProps) {
  const delta = chronoAge - bioAge;
  const deltaLabel =
    delta > 0
      ? `${delta} years younger`
      : delta < 0
        ? `${Math.abs(delta)} years older`
        : "On pace with your age";

  return (
    <GlassCard tint="dark" radius="3xl" padding="lg" style={styles.card}>
      <GradientOrb tone="amber" size={220} style={styles.orb} />
      <Text style={styles.label}>Biological age</Text>
      <Text style={styles.bioAge}>{bioAge}</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{deltaLabel}</Text>
      </View>
      <AgeCompareRow bioAge={bioAge} chronoAge={chronoAge} />
      <Text style={styles.explanation}>
        Calculated from your vascular, metabolic, and mental markers, compared with people your age.
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    overflow: "hidden",
  },
  orb: {
    top: -20,
    left: "50%",
    marginLeft: -110,
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkOnDarkMuted,
    marginBottom: spacing.sm,
  },
  bioAge: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.display,
    color: colors.inkOnDark,
    lineHeight: fontSizes.display * 1.05,
  },
  pill: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    backgroundColor: colors.amber,
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  pillText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.navy,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    width: "100%",
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  compareItem: {
    alignItems: "center",
  },
  compareValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineMd,
    color: colors.inkOnDarkMuted,
  },
  compareValueBio: {
    color: colors.amberLight,
  },
  compareLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
    marginTop: 2,
  },
  explanation: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
