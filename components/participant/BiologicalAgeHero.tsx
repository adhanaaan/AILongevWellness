import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ArrowRight, ChevronRight } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import {
  colors,
  fontFamilies,
  fontSizes,
  radii,
  shadows,
  spacing,
} from "@/lib/theme/tokens";

export interface BiologicalAgeHeroProps {
  bioAge: number;
  chronoAge: number;
  /** Omit to render non-interactively (e.g. in the preliminary pre-review preview). */
  onPress?: () => void;
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

export function BiologicalAgeHero({ bioAge, chronoAge, onPress }: BiologicalAgeHeroProps) {
  const delta = chronoAge - bioAge;
  const deltaLabel =
    delta > 0
      ? `${delta} years younger`
      : delta < 0
        ? `${Math.abs(delta)} years older`
        : "On pace with your age";

  const content = (
    <>
      <GradientOrb tone="amber" size={220} style={styles.orb} />
      {onPress && (
        <View style={styles.exploreHint}>
          <Text style={styles.exploreHintText}>See how this is calculated</Text>
          <ChevronRight size={14} color={colors.inkOnDarkMuted} />
        </View>
      )}
      <Text style={styles.label}>Biological age</Text>
      <Text style={styles.bioAge}>{bioAge}</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{deltaLabel}</Text>
      </View>
      <AgeCompareRow bioAge={bioAge} chronoAge={chronoAge} />
      <Text style={styles.explanation}>
        Calculated from your vascular, metabolic, and mental markers, compared with people your age.
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="See how your biological age is calculated"
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: colors.navy,
    borderRadius: radii["3xl"],
    padding: spacing["2xl"],
    ...shadows.soft,
  },
  exploreHint: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  exploreHintText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
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
