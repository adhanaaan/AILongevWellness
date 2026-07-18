import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

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
    partial: { backgroundColor: colors.warningTint },
    complete: { backgroundColor: colors.tealTint },
  };

  const statusLabels: Record<string, string> = {
    empty: "Not started",
    partial: "Partial",
    complete: "Complete",
  };

  const statusTextColors: Record<string, string> = {
    empty: colors.inkMuted,
    partial: colors.metabolicDark,
    complete: colors.tealDark,
  };

  return (
    <GlassCard
      tint="light"
      padding="md"
      radius="2xl"
      tintColor={highlight ? "rgba(212,168,83,0.16)" : undefined}
      tintBorderColor={highlight ? colors.amber : undefined}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, highlight && styles.iconCircleHighlight]}>
          {icon}
        </View>
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
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  iconCircleHighlight: {
    backgroundColor: colors.amber,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  statusBadge: {
    borderRadius: radii.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
  },
  statusText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
  },
  metaText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  metaDivider: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginHorizontal: spacing.xs,
  },
});
