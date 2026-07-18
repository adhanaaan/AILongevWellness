import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { colors, fontFamilies, fontSizes, spacing, radii } from "@/lib/theme/tokens";

type Tone = "sage" | "terracotta" | "danger" | "neutral";

interface SummaryStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: Tone;
}

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  sage: { bg: colors.tealTint, fg: colors.tealDark },
  terracotta: { bg: colors.warningTint, fg: colors.metabolicDark },
  danger: { bg: colors.dangerTint, fg: colors.danger },
  neutral: { bg: colors.surfaceMuted, fg: colors.inkMuted },
};

export function SummaryStatCard({ icon, label, value, tone }: SummaryStatCardProps) {
  const scheme = toneColors[tone];

  return (
    <GlassCard tint="light" radius="2xl">
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: scheme.bg }]}>
          {icon}
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  value: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
  },
});
