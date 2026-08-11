import React from "react";
import { View, StyleSheet } from "react-native";
import { StatusBadge } from "@/components/ui";
import type { Status } from "@/components/ui";
import type { PipelineState } from "@/lib/types/db";
import { spacing } from "@/lib/theme/tokens";

interface PipelineStatusBadgeProps {
  state: PipelineState;
  needsAttention: boolean;
  // GP and TCM sign off independently, in either order -- while state is
  // "gp_review" (awaiting one or both signatures), these say which specific
  // one is still outstanding instead of a label that always says "GP Review".
  gpSigned?: boolean;
  tcmSigned?: boolean;
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
  gp_review: "In Review",
  tcm_review: "In Review",
  signed: "Signed",
  delivered: "Delivered",
};

export function PipelineStatusBadge({ state, needsAttention, gpSigned, tcmSigned }: PipelineStatusBadgeProps) {
  let label = stateToLabel[state];
  if (state === "gp_review") {
    if (gpSigned && !tcmSigned) label = "Awaiting TCM";
    else if (tcmSigned && !gpSigned) label = "Awaiting GP";
  }
  return (
    <View style={styles.row}>
      <StatusBadge status={stateToStatus[state]} label={label} />
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
