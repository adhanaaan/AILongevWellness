import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Target, Check } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

export interface CarePlanFocusCardProps {
  firstName?: string;
  /** Top focus areas from the AI draft (suggested_focus). */
  focusAreas: string[];
  /** The participant's primary wellness goal (a GOALS label), if any. */
  goal?: string | null;
  /** How many markers are flagged to watch. */
  flaggedCount?: number;
}

// "Personalized for you" header for the Care Plan — makes it explicit that the
// protocol is built around THIS participant's results and goal, not a generic
// template. Only shown once a real AI draft exists (the caller gates on that).
export function CarePlanFocusCard({ firstName, focusAreas, goal, flaggedCount = 0 }: CarePlanFocusCardProps) {
  const chips = focusAreas.slice(0, 3);
  const watchLine =
    flaggedCount > 0
      ? `${flaggedCount} area${flaggedCount === 1 ? "" : "s"} to watch`
      : "your latest results";
  const goalLine = goal ? `, in service of your goal of ${goal.toLowerCase()}` : "";

  return (
    <Card padding="lg" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Target size={18} color={colors.sageDark} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Personalized for you</Text>
          <Text style={styles.title}>
            {firstName ? `Built around your results, ${firstName}` : "Built around your results"}
          </Text>
        </View>
      </View>

      <Text style={styles.body}>
        Your care team shaped this plan around {watchLine}
        {goalLine}.
      </Text>

      {chips.length > 0 && (
        <View style={styles.focusPanel}>
          <Text style={styles.focusLabel}>This plan focuses on</Text>
          {chips.map((f) => (
            <View key={f} style={styles.focusRow}>
              <View style={styles.focusTick}>
                <Check size={11} color={colors.sageDark} strokeWidth={3} />
              </View>
              <Text style={styles.focusText}>{f}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, backgroundColor: colors.sageTint, borderWidth: 0 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1, gap: 1 },
  eyebrow: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.sageDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: { fontFamily: fontFamilies.displaySemiBold, fontSize: fontSizes.bodyLg, color: colors.ink },
  body: { fontFamily: fontFamilies.body, fontSize: fontSizes.labelMd, color: colors.charcoal, lineHeight: 21 },
  focusPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  focusLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  focusRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  focusTick: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  focusText: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.charcoal,
    lineHeight: 20,
  },
});

