import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "@/components/ui";
import { colors, fontSizes, fontWeights, spacing, radii } from "@/lib/theme/tokens";

type Tone = "sage" | "terracotta" | "danger" | "neutral";

interface SummaryStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: Tone;
}

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  sage: { bg: colors.sageTint, fg: colors.sageDark },
  terracotta: { bg: colors.terracottaTint, fg: colors.terracottaInk },
  danger: { bg: colors.dangerTint, fg: colors.danger },
  neutral: { bg: colors.surfaceMuted, fg: colors.inkMuted },
};

export function SummaryStatCard({ icon, label, value, tone }: SummaryStatCardProps) {
  const scheme = toneColors[tone];

  return (
    <Card>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: scheme.bg }]}>
          {icon}
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Card>
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
    fontSize: fontSizes.headlineLg,
    fontWeight: fontWeights.bold,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.medium,
    color: colors.inkMuted,
  },
});
