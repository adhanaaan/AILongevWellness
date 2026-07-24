import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { colors, fontFamilies, fontSizes, spacing, radii } from "@/lib/theme/tokens";

type Tone = "sage" | "terracotta" | "danger" | "neutral";

interface SummaryStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: Tone;
  /** When provided, the card doubles as a filter toggle for that tone's slice of the list. */
  onPress?: () => void;
  active?: boolean;
}

const toneColors: Record<Tone, { bg: string; fg: string; border: string; activeBg: string }> = {
  sage: { bg: colors.tealTint, fg: colors.tealDark, border: colors.teal, activeBg: colors.tealTint },
  terracotta: {
    bg: colors.warningTint,
    fg: colors.metabolicDark,
    border: colors.warning,
    activeBg: colors.warningTint,
  },
  danger: { bg: colors.dangerTint, fg: colors.danger, border: colors.danger, activeBg: colors.dangerTint },
  neutral: { bg: colors.surfaceMuted, fg: colors.inkMuted, border: colors.borderStrong, activeBg: colors.surfaceMuted },
};

export function SummaryStatCard({ icon, label, value, tone, onPress, active }: SummaryStatCardProps) {
  const scheme = toneColors[tone];

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.75 : 1}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected: !!active } : undefined}
    >
      <GlassCard
        tint="light"
        radius="2xl"
        tintColor={active ? scheme.activeBg : undefined}
        tintBorderColor={active ? scheme.border : undefined}
      >
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: scheme.bg }]}>
            {icon}
          </View>
          <Text style={styles.value}>{value}</Text>
          <Text style={[styles.label, active && { color: scheme.fg, fontFamily: fontFamilies.bodySemiBold }]}>
            {label}
          </Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 140,
  },
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
