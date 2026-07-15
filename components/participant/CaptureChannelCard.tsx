import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface CaptureChannelCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  sourceTag: string;
  enteredBy: string;
  status: "empty" | "partial" | "complete";
  actionLabel: string;
  onAction: () => void;
  highlight?: boolean;
}

export function CaptureChannelCard({
  icon,
  title,
  description,
  sourceTag,
  enteredBy,
  status,
  actionLabel,
  onAction,
  highlight = false,
}: CaptureChannelCardProps) {
  const statusColors: Record<string, ViewStyle> = {
    empty: { backgroundColor: colors.surfaceMuted },
    partial: { backgroundColor: colors.terracottaTint },
    complete: { backgroundColor: colors.sageTint },
  };

  const statusLabels: Record<string, string> = {
    empty: "Not started",
    partial: "Partial",
    complete: "Complete",
  };

  const statusTextColors: Record<string, string> = {
    empty: colors.inkMuted,
    partial: colors.terracottaInk,
    complete: colors.sageDark,
  };

  return (
    <Card style={highlight ? styles.highlighted : undefined}>
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>{icon}</View>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.statusBadge, statusColors[status]]}>
          <Text style={[styles.statusText, { color: statusTextColors[status] }]}>
            {statusLabels[status]}
          </Text>
        </View>
        <Text style={styles.metaText}>{sourceTag}</Text>
        <Text style={styles.metaDivider}>{"·"}</Text>
        <Text style={styles.metaText}>{enteredBy}</Text>
      </View>

      <Button variant="secondary" size="sm" onPress={onAction}>
        {actionLabel}
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  highlighted: {
    borderColor: colors.sage,
    borderWidth: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.regular,
    color: colors.inkMuted,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  statusBadge: {
    borderRadius: radii.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
  },
  metaText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.inkMuted,
  },
  metaDivider: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginHorizontal: spacing.xs,
  },
});
