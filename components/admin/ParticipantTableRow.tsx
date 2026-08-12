import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronRight, AlertTriangle } from "lucide-react-native";
import { Button } from "@/components/ui";
import { CaptureCompletionBar } from "./CaptureCompletionBar";
import { PipelineStatusBadge } from "./PipelineStatusBadge";
import { colors, fontFamilies, fontSizes, fontWeights, spacing, radii } from "@/lib/theme/tokens";
import { resolveAttentionAction } from "@/lib/data/actions";
import type { ParticipantSummary } from "@/lib/types/db";

interface ParticipantTableRowProps {
  summary: ParticipantSummary;
  onPress: () => void;
}

export function ParticipantTableRow({
  summary,
  onPress,
}: ParticipantTableRowProps) {
  const { participant, pipeline, captureCompletionPct, gpSigned, tcmSigned } = summary;
  const needsAttention = pipeline.needs_attention;
  const initials = participant.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleResolve = async () => {
    await resolveAttentionAction(participant.id);
  };

  return (
    <TouchableOpacity
      style={[styles.row, needsAttention && styles.rowAttention]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.mainRow}>
        <View style={styles.nameCol}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.nameText}>
            <Text style={styles.name} numberOfLines={1}>
              {participant.name}
            </Text>
            <Text style={styles.meta}>
              {participant.age}y {participant.sex}
            </Text>
          </View>
        </View>

        <View style={styles.progressCol}>
          <CaptureCompletionBar value={captureCompletionPct} />
        </View>

        <View style={styles.statusCol}>
          <PipelineStatusBadge
            state={pipeline.state}
            needsAttention={needsAttention}
            gpSigned={gpSigned}
            tcmSigned={tcmSigned}
          />
        </View>

        <View style={styles.chevronCol}>
          <ChevronRight size={20} color={colors.inkMuted} />
        </View>
      </View>

      {needsAttention && pipeline.attention_reason && (
        <View style={styles.attentionRow}>
          <AlertTriangle size={14} color={colors.terracottaInk} />
          <Text style={styles.attentionReason} numberOfLines={1}>
            {pipeline.attention_reason}
          </Text>
          <Button variant="ghost" size="sm" onPress={handleResolve}>
            Resolve
          </Button>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowAttention: {
    backgroundColor: colors.terracottaTint,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameCol: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginRight: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.sageDark,
  },
  nameText: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  meta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  progressCol: {
    flex: 2,
    marginRight: spacing.md,
  },
  statusCol: {
    flex: 2,
    marginRight: spacing.md,
  },
  chevronCol: {
    width: 24,
    alignItems: "center",
  },
  attentionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.terracotta,
  },
  attentionReason: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.terracottaInk,
    flex: 1,
  },
});
