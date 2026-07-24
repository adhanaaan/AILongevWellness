import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ChevronDown, ChevronUp, MessageCircle, Sparkles } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

export interface TopRecommendationProps {
  topFocus?: string;
  topDiscussionPoint?: string;
  remainingCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
}

// Busy executives act on one thing, not a grid of four -- this leads with a
// single ranked focus + the single most important thing to ask a doctor, and
// keeps the full lists one tap away instead of upfront.
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
    <Card>
      <View style={styles.iconCircle}>
        <Sparkles size={18} color={colors.sage} />
      </View>

      {topFocus && (
        <>
          <Text style={styles.label}>Your top focus</Text>
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
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.sageDark,
  },
  focus: {
    fontSize: fontSizes.headlineSm,
    fontWeight: fontWeights.bold,
    color: colors.charcoal,
    marginTop: spacing.xs,
  },
  discussionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
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
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.inkMuted,
    marginBottom: 2,
  },
  discussionText: {
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    lineHeight: 22,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  toggleText: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.sage,
  },
});
