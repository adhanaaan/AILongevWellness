import React from "react";
import { View, Text, StyleSheet } from "react-native";
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

const RULER_MIN = 20;
const RULER_MAX = 90;

function positionPct(value: number): number {
  return Math.max(0, Math.min(100, ((value - RULER_MIN) / (RULER_MAX - RULER_MIN)) * 100));
}

// Plots both ages on one track instead of highlighting a single abstract tick
// -- the whole "biological vs. chronological" story only lands if you can
// actually see how far the two positions sit apart, not just read a delta
// pill on its own. Bio's label sits above the track, chrono's below, so they
// never collide even when the gap between them is small.
function AgeCompareRuler({ bioAge, chronoAge }: { bioAge: number; chronoAge: number }) {
  const bioPct = positionPct(bioAge);
  const chronoPct = positionPct(chronoAge);
  const fillLeft = Math.min(bioPct, chronoPct);
  const fillWidth = Math.abs(bioPct - chronoPct);

  return (
    <View style={styles.rulerWrap}>
      <View style={styles.labelRow}>
        <View style={[styles.bioLabelAnchor, { left: `${bioPct}%` }]}>
          <Text style={styles.bioLabelText} numberOfLines={1}>
            Biological {bioAge}
          </Text>
        </View>
      </View>

      <View style={styles.track}>
        {fillWidth > 0 && (
          <View style={[styles.trackFill, { left: `${fillLeft}%`, width: `${fillWidth}%` }]} />
        )}
        <View style={[styles.dot, styles.chronoDot, { left: `${chronoPct}%` }]} />
        <View style={[styles.dot, styles.bioDot, { left: `${bioPct}%` }]} />
      </View>

      <View style={styles.labelRow}>
        <View style={[styles.chronoLabelAnchor, { left: `${chronoPct}%` }]}>
          <Text style={styles.chronoLabelText} numberOfLines={1}>
            Your age {chronoAge}
          </Text>
        </View>
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
      <AgeCompareRuler bioAge={bioAge} chronoAge={chronoAge} />
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
  rulerWrap: {
    width: "100%",
  },
  labelRow: {
    height: 18,
    position: "relative",
  },
  bioLabelAnchor: {
    position: "absolute",
    top: 0,
  },
  bioLabelText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.inkOnDark,
  },
  chronoLabelAnchor: {
    position: "absolute",
    top: 4,
  },
  chronoLabelText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    position: "relative",
  },
  trackFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: colors.amber,
  },
  dot: {
    position: "absolute",
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
  },
  bioDot: {
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  chronoDot: {
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  explanation: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
