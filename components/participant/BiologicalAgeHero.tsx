import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
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

// How far above/below chronological age the bar spans. computeBiologicalAge
// clamps the delta into roughly this window, so a ±15y scale keeps the marker
// on-track at any realistic value while centering "your age".
const AGE_WINDOW = 15;

// An Oura-style position bar: the biological-age delta shown as a marker on a
// younger <-> older track centered on chronological age, rather than two bare
// numbers. Reads the "am I ahead or behind?" answer at a glance and gives the
// hero a premium, data-forward moment.
function AgePositionBar({ bioAge, chronoAge }: { bioAge: number; chronoAge: number }) {
  const min = chronoAge - AGE_WINDOW;
  const max = chronoAge + AGE_WINDOW;
  const pct = Math.max(4, Math.min(96, ((bioAge - min) / (max - min)) * 100));
  const younger = bioAge < chronoAge;
  const markerColor = bioAge === chronoAge ? colors.amberLight : younger ? colors.amber : colors.terracotta;

  return (
    <View style={styles.ageBar}>
      <View style={styles.ageTrack}>
        <View style={styles.ageCenterTick} />
        <View style={[styles.ageMarker, { left: `${pct}%`, backgroundColor: markerColor }]} />
      </View>
      <View style={styles.ageEnds}>
        <Text style={styles.ageEndLabel}>Younger</Text>
        <Text style={styles.ageAnchor}>Your age {chronoAge}</Text>
        <Text style={styles.ageEndLabel}>Older</Text>
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
      {/* Layered, dual-tone ambient glow (brand amber + green) for depth. */}
      <GradientOrb tone="teal" size={300} style={styles.orbBack} />
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
      <AgePositionBar bioAge={bioAge} chronoAge={chronoAge} />
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
  orbBack: {
    bottom: -80,
    right: -80,
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
  ageBar: {
    width: "100%",
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  ageTrack: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
  },
  ageCenterTick: {
    position: "absolute",
    left: "50%",
    marginLeft: -1,
    top: -4,
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  ageMarker: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    top: -5,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  ageEnds: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  ageEndLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.overline,
    color: colors.inkOnDarkMuted,
  },
  ageAnchor: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.inkOnDark,
  },
  explanation: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
