import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Check, Plus, Smile, Meh, Frown } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

const MOODS = [
  { label: "Great", Icon: Smile, score: 9 },
  { label: "Okay", Icon: Meh, score: 6 },
  { label: "Low", Icon: Frown, score: 3 },
] as const;

function moodLabel(score: number): string {
  return MOODS.slice().sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))[0].label;
}

export interface TodayActionsListProps {
  medications: string[];
  takenToday: string[];
  moodScore: number | null;
  onToggleMed: (name: string, taken: boolean) => void;
  onSetMood: (score: number) => void;
  onManageMeds: () => void;
}

// Today's actionable protocol items in one checkable timeline (à la Superpower's
// "Protocol"): each supplement the participant takes, plus the daily mood
// check-in. Only the two self-report categories surface here — nutrition/
// exercise/sleep are plan-only, so there's nothing honest to check off for them.
export function TodayActionsList({
  medications,
  takenToday,
  moodScore,
  onToggleMed,
  onSetMood,
  onManageMeds,
}: TodayActionsListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const moodDone = moodScore !== null;
  const showPicker = !moodDone || pickerOpen;

  return (
    <Card padding="none" style={styles.card}>
      {medications.length === 0 ? (
        <Pressable style={styles.row} onPress={onManageMeds} accessibilityRole="button">
          <View style={styles.circleOutline}>
            <Plus size={14} color={colors.inkMuted} strokeWidth={2.5} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>Add your supplements</Text>
            <Text style={styles.sub}>Track what you take each day</Text>
          </View>
        </Pressable>
      ) : (
        medications.map((name, i) => {
          const taken = takenToday.includes(name);
          return (
            <Pressable
              key={name}
              style={[styles.row, i > 0 && styles.divider]}
              onPress={() => onToggleMed(name, !taken)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: taken }}
              accessibilityLabel={name}
            >
              <View style={[styles.circle, taken ? styles.circleDone : styles.circleOutline]}>
                {taken && <Check size={14} color={colors.white} strokeWidth={3.5} />}
              </View>
              <View style={styles.body}>
                <Text style={[styles.title, taken && styles.titleDone]}>{name}</Text>
                <Text style={styles.sub}>Medications &amp; supplements</Text>
              </View>
            </Pressable>
          );
        })
      )}

      <Pressable
        style={[styles.row, styles.divider]}
        onPress={() => setPickerOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Daily mood check-in"
      >
        <View style={[styles.circle, moodDone ? styles.circleDoneMental : styles.circleOutline]}>
          {moodDone && <Check size={14} color={colors.white} strokeWidth={3.5} />}
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, moodDone && !pickerOpen && styles.titleDone]}>Daily check-in</Text>
          <Text style={styles.sub}>
            {moodDone ? `Feeling ${moodLabel(moodScore).toLowerCase()}` : "How are you feeling today?"}
          </Text>
        </View>
      </Pressable>

      {showPicker && (
        <View style={styles.moodRow}>
          {MOODS.map(({ label, Icon, score }) => {
            const active = moodDone && moodLabel(moodScore).toLowerCase() === label.toLowerCase();
            return (
              <Pressable
                key={label}
                style={[styles.moodBtn, active && styles.moodBtnActive]}
                onPress={() => {
                  onSetMood(score);
                  setPickerOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Feeling ${label}`}
              >
                <Icon size={18} color={active ? colors.sageDark : colors.inkMuted} />
                <Text style={[styles.moodLabel, active && styles.moodLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  circleOutline: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    width: 26,
    height: 26,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  circleDone: { backgroundColor: colors.sage },
  circleDoneMental: { backgroundColor: colors.mentalDark },
  body: { flex: 1, gap: 1 },
  title: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.charcoal,
  },
  titleDone: {
    color: colors.inkMuted,
    textDecorationLine: "line-through",
  },
  sub: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  moodRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    marginLeft: 26 + spacing.md,
  },
  moodBtn: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  moodBtnActive: {
    borderColor: colors.sage,
    backgroundColor: colors.sageTint,
  },
  moodLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  moodLabelActive: {
    color: colors.sageDark,
  },
});
