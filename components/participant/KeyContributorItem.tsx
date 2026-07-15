import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CheckCircle2, AlertTriangle } from "lucide-react-native";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface KeyContributorItemProps {
  text: string;
  tone: "good" | "monitor";
}

export function KeyContributorItem({ text, tone }: KeyContributorItemProps) {
  const isGood = tone === "good";
  const bgColor = isGood ? colors.sageTint : colors.terracottaTint;
  const iconColor = isGood ? colors.sage : colors.terracotta;
  const Icon = isGood ? CheckCircle2 : AlertTriangle;

  return (
    <View style={[styles.row, { backgroundColor: bgColor }]}>
      <Icon size={18} color={iconColor} style={styles.icon} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.regular,
    color: colors.charcoal,
  },
});
