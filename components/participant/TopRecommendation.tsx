import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, fontWeights, lineHeights, spacing } from "@/lib/theme/tokens";

export interface TopRecommendationProps {
  topFocus?: string;
  topDiscussionPoint?: string;
  remainingCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
}

// Busy executives act on one thing, not a grid of four -- this leads with a
// single ranked focus + the single most important thing to ask a doctor, and
// keeps the full lists one tap away instead of upfront. Calm-clinical register:
// quiet overlines instead of an icon-circle, generous card padding.
export function TopRecommendation({
  topFocus,
  topDiscussionPoint,
  remainingCount,
  expanded,
  onToggleExpanded,
}: TopRecommendationProps) {
  if (!topFocus && !topDiscussionPoint) return null;
  const ChevronIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <Card padding="lg">
      {topFocus && (
        <>
          <Text style={styles.overline}>Your top focus</Text>
          <Text style={styles.focus}>{topFocus}</Text>
        </>
      )}

      {topDiscussionPoint && (
        <View style={[styles.discussionRow, !topFocus && styles.discussionRowNoBorder]}>
          <MessageCircle size={16} color={colors.inkMuted} style={styles.discussionIcon} />
          <View style={styles.discussionTextGroup}>
            <Text style={styles.discussionLabel}>Bring up with your doctor</Text>
            <Text style={styles.discussionText}>{topDiscussionPoint}</Text>
          </View>
        </View>
      )}

      {remainingCount > 0 && (
        <Pressable
          onPress={onToggleExpanded}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={
            expanded
              ? "Hide additional recommendations"
              : `See all ${remainingCount + 1} recommendations`
          }
          style={styles.toggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.toggleText}>
            {expanded ? "Show less" : `See all ${remainingCount + 1} recommendations`}
          </Text>
          <ChevronIcon size={16} color={colors.sage} />
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  overline: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.inkMuted,
  },
  focus: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.charcoal,
    marginTop: spacing.sm,
    lineHeight: lineHeights.headlineSm,
  },
  discussionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  discussionRowNoBorder: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  discussionIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  discussionTextGroup: {
    flex: 1,
  },
  discussionLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.inkMuted,
    marginBottom: 4,
  },
  discussionText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    lineHeight: lineHeights.bodyMd,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  toggleText: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.sage,
  },
});
