import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck, Sparkles } from "lucide-react-native";
import type { Review } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface DraftStatusBadgeProps {
  isDelivered: boolean;
  gp?: Review;
  tcm?: Review;
  /** Count of biomarkers not yet captured — only shown in the pending state, to set expectations that this gets richer. */
  missingCount?: number;
}

/**
 * Sits above the score itself in both states, so the participant always knows
 * exactly how trustworthy what they're looking at is: an AI-drafted first
 * pass they shouldn't over-index on yet, versus a named clinician's signed-off
 * assessment. Per product direction: show the AI draft immediately rather
 * than hiding everything until delivery, but never blur the line between the
 * two — the badge is what keeps that line visible everywhere this data shows.
 */
export function DraftStatusBadge({ isDelivered, gp, tcm, missingCount }: DraftStatusBadgeProps) {
  if (isDelivered) {
    const reviewers = [gp, tcm].filter((r): r is Review => Boolean(r));
    if (reviewers.length === 0) return null;
    const label = reviewers.map((r) => `${r.reviewer_name} (${r.reviewer_credential})`).join(" & ");
    return (
      <View style={[styles.badge, styles.badgeDelivered]}>
        <ShieldCheck size={16} color={colors.sageDark} />
        <Text style={[styles.text, styles.textDelivered]}>
          <Text style={styles.textBold}>Reviewed & signed off</Text> by {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.badgePending]}>
      <Sparkles size={16} color={colors.terracottaInk} />
      <Text style={[styles.text, styles.textPending]}>
        <Text style={styles.textBold}>AI-drafted</Text> · pending your care team&apos;s review
        {missingCount ? ` — sharpens as you upload more data (${missingCount} still missing)` : ""}
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
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  badgeDelivered: {
    backgroundColor: colors.sageTint,
  },
  badgePending: {
    backgroundColor: colors.terracottaTint,
  },
  text: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    lineHeight: 16,
  },
  textDelivered: {
    color: colors.sageDark,
  },
  textPending: {
    color: colors.terracottaInk,
  },
  textBold: {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: fontWeights.semibold,
  },
});
