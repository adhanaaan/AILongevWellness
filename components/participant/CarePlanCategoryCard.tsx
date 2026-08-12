import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight, Check, type LucideIcon } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface CarePlanTodayStatus {
  text: string;
  done: boolean;
}

export interface CarePlanCategoryCardProps {
  label: string;
  Icon: LucideIcon;
  color: string;
  planSnippet: string;
  moreCount: number;
  /** Present only for tracked categories (a daily self-report), rendered as a "Today" footer chip. */
  status?: CarePlanTodayStatus | null;
  onPress: () => void;
}

// A roomy, color-identified card per care-plan category (WHOOP/Bevel style),
// replacing the old cramped divided rows. Tracked categories (medications,
// mindfulness) surface today's completion as a prominent footer chip instead of
// a faint gray status line, so "what's left to do today" reads at a glance.
export function CarePlanCategoryCard({
  label,
  Icon,
  color,
  planSnippet,
  moreCount,
  status,
  onPress,
}: CarePlanCategoryCardProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Card padding="lg" style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: `${color}1A` }]}>
            <Icon size={20} color={color} />
          </View>
          <View style={styles.text}>
            <View style={styles.headerRow}>
              <Text style={styles.label}>{label}</Text>
              {moreCount > 0 && <Text style={styles.moreCount}>+{moreCount} more</Text>}
            </View>
            <Text style={styles.plan} numberOfLines={2}>
              {planSnippet}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.inkMuted} style={styles.chev} />
        </View>

        {status && (
          <View style={styles.footer}>
            <Text style={styles.todayLabel}>Today</Text>
            <View style={[styles.chip, status.done ? styles.chipDone : styles.chipPending]}>
              {status.done && <Check size={13} color={colors.sageDark} strokeWidth={3} />}
              <Text style={[styles.chipText, status.done ? styles.chipTextDone : styles.chipTextPending]}>
                {status.text}
              </Text>
            </View>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {},
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 3 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyLg,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    flexShrink: 1,
  },
  moreCount: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  plan: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  chev: { marginTop: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  todayLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  chipDone: { backgroundColor: colors.sageTint },
  chipPending: { backgroundColor: colors.surfaceMuted },
  chipText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },
  chipTextDone: { color: colors.sageDark },
  chipTextPending: { color: colors.inkMuted },
});
