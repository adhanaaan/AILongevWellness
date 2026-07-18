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
const RULER_TICKS = 28;

function TickRuler({ value }: { value: number }) {
  const markerIndex = Math.round(
    ((value - RULER_MIN) / (RULER_MAX - RULER_MIN)) * (RULER_TICKS - 1)
  );

  return (
    <View style={styles.ruler}>
      {Array.from({ length: RULER_TICKS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.tick,
            i === markerIndex ? styles.tickActive : styles.tickInactive,
          ]}
        />
      ))}
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
        : "On pace with age";

  return (
    <GlassCard tint="dark" radius="3xl" padding="lg" style={styles.card}>
      <GradientOrb tone="amber" size={220} style={styles.orb} />
      <Text style={styles.label}>Biological age</Text>
      <Text style={styles.bioAge}>{bioAge}</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{deltaLabel}</Text>
      </View>
      <TickRuler value={bioAge} />
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
  ruler: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    width: "100%",
  },
  tick: {
    flex: 1,
    borderRadius: 1,
  },
  tickInactive: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tickActive: {
    height: 20,
    backgroundColor: colors.amber,
  },
});
