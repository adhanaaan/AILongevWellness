import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Activity } from "lucide-react-native";
import { OnboardingStepper } from "@/components/layout/OnboardingStepper";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { updateParticipantAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ExerciseFrequency, AlcoholDrinksPerWeek } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

const EXERCISE_OPTIONS: { value: ExerciseFrequency; title: string; description: string }[] = [
  { value: "rarely", title: "Rarely", description: "Little to no regular exercise" },
  {
    value: "sometimes",
    title: "Sometimes",
    description: "A workout here and there, a few times a month",
  },
  { value: "regularly", title: "Regularly", description: "Structured exercise most weeks" },
];

const ALCOHOL_OPTIONS: { value: AlcoholDrinksPerWeek; label: string }[] = [
  { value: "none", label: "None" },
  { value: "1_to_7", label: "1 to 7" },
  { value: "8_to_14", label: "8 to 14" },
  { value: "15_to_21", label: "15 to 21" },
  { value: "21_plus", label: "More than 21" },
];

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function ProfileLifestylePage() {
  const router = useRouter();
  const { participantId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<ExerciseFrequency>("sometimes");
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState<AlcoholDrinksPerWeek>("1_to_7");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!participantId) return;
    repository.getParticipant(participantId).then((p) => {
      if (p) {
        setExercise(p.exercise_frequency ?? "sometimes");
        setSmoking(p.smoking ?? false);
        setAlcohol(p.alcohol_drinks_per_week ?? "1_to_7");
      }
      setLoading(false);
    });
  }, [participantId]);

  async function onContinue() {
    if (!participantId) return;
    setSaving(true);
    try {
      await updateParticipantAction(participantId, {
        exercise_frequency: exercise,
        smoking,
        alcohol_drinks_per_week: alcohol,
      });
      router.push("/onboarding/capture");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <OnboardingStepper>
        <View style={styles.center}>
          <Text style={styles.subtitle}>Loading…</Text>
        </View>
      </OnboardingStepper>
    );
  }

  return (
    <OnboardingStepper>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <Activity size={24} color={colors.teal} />
        </GlassCard>

        <Text style={styles.title}>Lifestyle</Text>
        <Text style={styles.subtitle}>A few habits that shape your wellness picture.</Text>

        <View style={styles.section}>
          <SectionLabel>How often do you exercise?</SectionLabel>
          <View style={styles.radioList}>
            {EXERCISE_OPTIONS.map((option) => {
              const selected = exercise === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.radioCard, selected && styles.radioCardSelected]}
                  onPress={() => setExercise(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioCardText}>
                    <Text style={styles.radioCardTitle}>{option.title}</Text>
                    <Text
                      style={[
                        styles.radioCardDescription,
                        selected && styles.radioCardDescriptionSelected,
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                  <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>Do you currently smoke?</SectionLabel>
          <View style={styles.smokingRow}>
            <TouchableOpacity
              style={[styles.smokingCard, smoking && styles.radioCardSelected]}
              onPress={() => setSmoking(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.radioCardTitle}>Yes</Text>
              <View style={[styles.radioCircle, smoking && styles.radioCircleSelected]}>
                {smoking && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smokingCard, !smoking && styles.radioCardSelected]}
              onPress={() => setSmoking(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.radioCardTitle}>No</Text>
              <View style={[styles.radioCircle, !smoking && styles.radioCircleSelected]}>
                {!smoking && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>How many alcoholic drinks do you have per week?</SectionLabel>
          <View style={styles.chipGrid}>
            {ALCOHOL_OPTIONS.map((option) => {
              const selected = alcohol === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setAlcohol(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" disabled={saving} onPress={onContinue}>
          Continue
        </Button>
      </View>
    </OnboardingStepper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineMd,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  section: {
    marginTop: spacing["2xl"],
  },
  sectionLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  radioList: {
    gap: spacing.md,
  },
  radioCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  radioCardSelected: {
    backgroundColor: colors.tealTint,
    borderColor: colors.teal,
  },
  radioCardText: {
    flex: 1,
    marginRight: spacing.md,
  },
  radioCardTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
  },
  radioCardDescription: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  radioCardDescriptionSelected: {
    color: colors.inkMuted,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.white,
  },
  smokingRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  smokingCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  chipSelected: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  chipText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.white,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
