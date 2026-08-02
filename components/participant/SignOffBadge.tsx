import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import type { Review } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface SignOffBadgeProps {
  gp?: Review;
  tcm?: Review;
}

/**
 * A compact trust strip shown above the score itself — the point is that a
 * visitor sees "clinically reviewed" before they see any number, not buried
 * in a notes card further down. This is the platform's real differentiator
 * against AI-only competitors: every card is reviewed and signed off by a
 * named clinician before release, not just an AI draft with human escalation
 * available on request.
 */
export function SignOffBadge({ gp, tcm }: SignOffBadgeProps) {
  const reviewers = [gp, tcm].filter((r): r is Review => Boolean(r));
  if (reviewers.length === 0) return null;

  const label = reviewers.map((r) => `${r.reviewer_name} (${r.reviewer_credential})`).join(" & ");

  return (
    <View style={styles.badge}>
      <ShieldCheck size={16} color={colors.sageDark} />
      <Text style={styles.text}>
        <Text style={styles.textBold}>Reviewed & signed off</Text> by {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.sageTint,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  text: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.sageDark,
    lineHeight: 16,
  },
  textBold: {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: fontWeights.semibold,
  },
});
