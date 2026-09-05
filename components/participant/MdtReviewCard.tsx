import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Users, Check, Clock } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { MDT_PANEL, MDT_IN_PROGRESS } from "@/lib/mdt/panel";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

function initials(name: string) {
  const parts = name.replace(/^Dr\.?\s+/i, "").trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

// Multidisciplinary Team (MDT) review panel — a trust signal showing the specialists
// reviewing the participant's case, and where that review is up to. Presented as
// "in progress" while any member is still reviewing (see lib/mdt/panel.ts).
export function MdtReviewCard() {
  return (
    <Card padding="lg" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Users size={18} color={colors.sageDark} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Multidisciplinary Team review</Text>
          <Text style={styles.subtitle}>
            A panel of specialists reviews your results together before your plan is finalised.
          </Text>
        </View>
        {MDT_IN_PROGRESS && (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>In progress</Text>
          </View>
        )}
      </View>

      <View style={styles.list}>
        {MDT_PANEL.map((r) => {
          const reviewed = r.status === "reviewed";
          return (
            <View key={r.name} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(r.name)}</Text>
              </View>
              <Text style={styles.name}>{r.name}</Text>
              <View style={[styles.chip, reviewed ? styles.chipDone : styles.chipPending]}>
                {reviewed ? (
                  <Check size={12} color={colors.sageDark} strokeWidth={2.6} />
                ) : (
                  <Clock size={12} color={colors.metabolicDark} strokeWidth={2.4} />
                )}
                <Text style={[styles.chipText, reviewed ? styles.chipTextDone : styles.chipTextPending]}>
                  {reviewed ? "Reviewed" : "In review"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: fontFamilies.displaySemiBold, fontSize: fontSizes.bodyLg, color: colors.ink },
  subtitle: { fontFamily: fontFamilies.body, fontSize: fontSizes.caption, color: colors.inkMuted, lineHeight: 17 },
  statusPill: {
    backgroundColor: colors.metabolicLighter,
    borderRadius: radii.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  statusPillText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.metabolicDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  list: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.caption, color: colors.sageDark },
  name: { flex: 1, fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.bodyMd, color: colors.ink },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  chipDone: { backgroundColor: colors.tealTint },
  chipPending: { backgroundColor: colors.metabolicLighter },
  chipText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipTextDone: { color: colors.sageDark },
  chipTextPending: { color: colors.metabolicDark },
});
