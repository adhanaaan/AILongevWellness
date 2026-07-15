import React from "react";
import { View, StyleSheet } from "react-native";
import { StatusBadge } from "@/components/ui";
import type { Status } from "@/components/ui";
import type { PipelineState } from "@/lib/types/db";
import { spacing } from "@/lib/theme/tokens";

interface PipelineStatusBadgeProps {
  state: PipelineState;
  needsAttention: boolean;
}

const stateToStatus: Record<PipelineState, Status> = {
  capturing: "processing",
  ai_drafted: "draft",
  gp_review: "pending",
  tcm_review: "pending",
  signed: "signed",
  delivered: "delivered",
};

const stateToLabel: Record<PipelineState, string> = {
  capturing: "Capturing",
  ai_drafted: "AI Drafted",
  gp_review: "GP Review",
  tcm_review: "TCM Review",
  signed: "Signed",
  delivered: "Delivered",
};

export function PipelineStatusBadge({ state, needsAttention }: PipelineStatusBadgeProps) {
  return (
    <View style={styles.row}>
      <StatusBadge status={stateToStatus[state]} label={stateToLabel[state]} />
      {needsAttention && (
        <StatusBadge status="needs-attention" label="Needs Attention" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
});
