import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export type Status =
  | "good"
  | "strong"
  | "signed"
  | "delivered"
  | "monitor"
  | "needs-attention"
  | "pending"
  | "processing"
  | "queued"
  | "draft";

interface StatusColors {
  bg: string;
  text: string;
}

const statusColorMap: Record<Status, StatusColors> = {
  good: { bg: colors.sageTint, text: colors.sageDark },
  strong: { bg: colors.sageTint, text: colors.sageDark },
  signed: { bg: colors.sageTint, text: colors.sageDark },
  delivered: { bg: colors.sageTint, text: colors.sageDark },
  monitor: { bg: colors.terracottaTint, text: colors.terracottaInk },
  "needs-attention": { bg: colors.dangerTint, text: colors.danger },
  pending: { bg: colors.surfaceMuted, text: colors.inkMuted },
  processing: { bg: colors.surfaceMuted, text: colors.inkMuted },
  queued: { bg: colors.surfaceMuted, text: colors.inkMuted },
  draft: { bg: colors.surfaceMuted, text: colors.inkMuted },
};

export interface StatusBadgeProps {
  status: Status;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colorScheme = statusColorMap[status];
  const displayLabel = label ?? status.replace("-", " ");

  return (
    <View style={[styles.container, { backgroundColor: colorScheme.bg }]}>
      <Text style={[styles.text, { color: colorScheme.text }]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    textTransform: "capitalize",
  },
});
