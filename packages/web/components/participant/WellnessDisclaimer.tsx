import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { WELLNESS_DISCLAIMER } from "@/lib/ava/constants";
import { colors, fontSizes, spacing } from "@/lib/theme/tokens";

// A persistent, low-emphasis compliance footer for participant-facing screens
// that surface scores or biological age (Insights, pillar detail, bio-age).
// Best-in-class wellness apps (e.g. Oura) keep this line visible on the same
// screen as the numbers rather than burying it -- and CLAUDE.md rule #6 requires
// the "wellness, not diagnosis" framing to be present. Reuses the single-source
// WELLNESS_DISCLAIMER sentence so the wording never drifts from AVA's.
export function WellnessDisclaimer() {
  return (
    <View style={styles.row}>
      <ShieldCheck size={14} color={colors.inkMuted} />
      <Text style={styles.text}>{WELLNESS_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing["3xl"],
    paddingHorizontal: spacing.md,
  },
  text: {
    flexShrink: 1,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
  },
});
