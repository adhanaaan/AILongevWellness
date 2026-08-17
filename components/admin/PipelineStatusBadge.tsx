import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { PipelineState } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

interface PipelineStatusBadgeProps {
  state: PipelineState;
  needsAttention: boolean;
  // GP and TCM sign off independently, in either order -- while state is
  // "gp_review" (awaiting one or both signatures), these say which specific
  // one is still outstanding instead of a label that always says "GP Review".
  gpSigned?: boolean;
  tcmSigned?: boolean;
}

interface PillScheme {
  bg: string;
  fg: string;
  dot: string;
}

// Quiet console pills: a leading status dot + label on a soft tinted ground,
// so the pipeline stage reads at a glance without a loud colored block. Colors
// stay on the locked palette and mirror the participant-side status language.
const stateToScheme: Record<PipelineState, PillScheme> = {
  capturing: { bg: colors.surfaceMuted, fg: colors.inkMuted, dot: colors.borderStrong },
  ai_drafted: { bg: colors.surfaceMuted, fg: colors.inkMuted, dot: colors.borderStrong },
  gp_review: { bg: colors.warningTint, fg: colors.metabolicDark, dot: colors.warning },
  tcm_review: { bg: colors.warningTint, fg: colors.metabolicDark, dot: colors.warning },
  signed: { bg: colors.tealTint, fg: colors.tealDark, dot: colors.teal },
  delivered: { bg: colors.tealTint, fg: colors.tealDark, dot: colors.teal },
};

const stateToLabel: Record<PipelineState, string> = {
  capturing: "Capturing",
  ai_drafted: "AI Drafted",
  gp_review: "In Review",
  tcm_review: "In Review",
  signed: "Signed",
  delivered: "Delivered",
};

function Pill({ scheme, label }: { scheme: PillScheme; label: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: scheme.bg }]}>
      <View style={[styles.dot, { backgroundColor: scheme.dot }]} />
      <Text style={[styles.label, { color: scheme.fg }]}>{label}</Text>
    </View>
  );
}

export function PipelineStatusBadge({
  state,
  needsAttention,
  gpSigned,
  tcmSigned,
}: PipelineStatusBadgeProps) {
  let label = stateToLabel[state];
  if (state === "gp_review") {
    if (gpSigned && !tcmSigned) label = "Awaiting TCM";
    else if (tcmSigned && !gpSigned) label = "Awaiting GP";
  }

  const attentionScheme: PillScheme = {
    bg: colors.dangerTint,
    fg: colors.danger,
    dot: colors.danger,
  };

  return (
    <View style={styles.row}>
      <Pill scheme={stateToScheme[state]} label={label} />
      {needsAttention && <Pill scheme={attentionScheme} label="Needs attention" />}
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
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
  },
});
