import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Button } from "@/components/ui";
import { CaptureCompletionBar } from "./CaptureCompletionBar";
import { PipelineStatusBadge } from "./PipelineStatusBadge";
import { colors, fontSizes, fontWeights, spacing, radii } from "@/lib/theme/tokens";
import { resolveAttentionAction } from "@/lib/data/actions";
import type { ParticipantSummary, PipelineState } from "@/lib/types/db";

interface ParticipantTableRowProps {
  summary: ParticipantSummary;
  onPress: () => void;
}

// Left-edge rail color: where a participant sits in the pipeline, at a glance,
// before reading the status badge text. Amber = actionable by the care team now.
const railColorByState: Record<PipelineState, string> = {
  capturing: colors.borderStrong,
  ai_drafted: colors.borderStrong,
  gp_review: colors.warning,
  tcm_review: colors.warning,
  signed: colors.teal,
  delivered: colors.tealDark,
};

export function ParticipantTableRow({
  summary,
  onPress,
}: ParticipantTableRowProps) {
  const { participant, pipeline, captureCompletionPct } = summary;
  const needsAttention = pipeline.needs_attention;
  const railColor = needsAttention ? colors.danger : railColorByState[pipeline.state];

  const handleResolve = async () => {
    await resolveAttentionAction(participant.id);
  };

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { borderLeftColor: railColor },
        needsAttention && styles.rowAttention,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.nameCol}>
        <Text style={styles.name}>{participant.name}</Text>
        <Text style={styles.meta}>
          {participant.age}y {participant.sex}
        </Text>
      </View>

      <View style={styles.progressCol}>
        <CaptureCompletionBar value={captureCompletionPct} />
      </View>

      <View style={styles.statusCol}>
        <PipelineStatusBadge
          state={pipeline.state}
          needsAttention={needsAttention}
        />
      </View>

      {needsAttention && pipeline.attention_reason && (
        <View style={styles.attentionCol}>
          <Text style={styles.attentionReason} numberOfLines={1}>
            {pipeline.attention_reason}
          </Text>
          <Button variant="ghost" size="sm" onPress={handleResolve}>
            Resolve
          </Button>
        </View>
      )}

      <View style={styles.chevronCol}>
        <ChevronRight size={20} color={colors.inkMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 3,
  },
  rowAttention: {
    backgroundColor: colors.terracottaTint,
  },
  nameCol: {
    flex: 2,
    marginRight: spacing.md,
  },
  name: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  meta: {
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
  attentionCol: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  attentionReason: {
    fontSize: fontSizes.caption,
    color: colors.terracottaInk,
    flex: 1,
  },
  chevronCol: {
    width: 24,
    alignItems: "center",
  },
});
