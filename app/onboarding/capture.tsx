import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ClipboardList, Watch, PersonStanding, FileText, Brain, type LucideIcon } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { HubSectionCard } from "@/components/participant/HubSectionCard";
import { Card } from "@/components/ui/Card";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getOnboardingProgressAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CAPTURE_SECTIONS, deriveSectionState, type CaptureSectionId } from "@/lib/onboarding/flow";
import type {
  AlcoholDrinksPerWeek,
  ExerciseFrequency,
  OnboardingProgress,
  Participant,
} from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing, teal } from "@/lib/theme/tokens";

const SECTION_ICON: Record<CaptureSectionId, LucideIcon> = {
  questionnaire: ClipboardList,
  wearables: Watch,
  body_composition: PersonStanding,
  lab_reports: FileText,
  recognize: Brain,
};

const SECTION_DESCRIPTION: Record<CaptureSectionId, string> = {
  questionnaire: "A few questions about you and your lifestyle.",
  wearables: "Connect your Apple Health data.",
  body_composition: "Record your body composition.",
  lab_reports: "Upload a recent lab report and we'll pull out the key results.",
  recognize: "A short cognitive assessment.",
};

const SEX_LABEL: Record<Participant["sex"], string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

const EXERCISE_PHRASE: Record<ExerciseFrequency, string> = {
  rarely: "Rarely exercises",
  sometimes: "Exercises sometimes",
  regularly: "Exercises regularly",
};

const ALCOHOL_PHRASE: Record<AlcoholDrinksPerWeek, string> = {
  none: "No alcohol",
  "1_to_7": "1 to 7 drinks a week",
  "8_to_14": "8 to 14 drinks a week",
  "15_to_21": "15 to 21 drinks a week",
  "21_plus": "21+ drinks a week",
};

const ZONE_GRADIENT_STOPS = [
  { offset: "0", color: teal[50] },
  { offset: "1", color: teal[100] },
];

export default function CaptureHubPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    if (!participantId) return;
    function load() {
      getOnboardingProgressAction(participantId!).then(setProgress);
      repository.getParticipant(participantId!).then(setParticipant);
    }
    load();
    return repository.subscribe(load);
  }, [participantId]);

  const questionnaireSection = CAPTURE_SECTIONS.find((s) => s.id === "questionnaire")!;
  const questionnaireDone =
    progress && deriveSectionState(progress, questionnaireSection) === "done";

  const doneCount = progress
    ? CAPTURE_SECTIONS.filter((s) => deriveSectionState(progress, s) === "done").length
    : 0;
  const completionPercent = Math.round((doneCount / CAPTURE_SECTIONS.length) * 100);

  const showLifestyleLine =
    participant?.exercise_frequency !== undefined &&
    participant?.smoking !== undefined &&
    participant?.alcohol_drinks_per_week !== undefined;

  return (
    <CaptureFlowStepper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <ClipboardList size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Data Capture</Text>
        <Text style={styles.subtitle}>
          Complete each section below to build your wellness snapshot. Start
          with the Questionnaire, then the rest unlock as you go.
        </Text>

        <Card padding="lg" style={styles.outerCard}>
          {questionnaireDone && participant && (
            <View style={styles.profileBlock}>
              <Text style={styles.profileHeading}>Your profile</Text>
              <Text style={styles.profileLine}>
                {participant.name} · {SEX_LABEL[participant.sex]} · {participant.age} ·{" "}
                {participant.height_cm} cm · {participant.weight_kg} kg
              </Text>

              {participant.goals.length > 0 && (
                <View style={styles.goalsRow}>
                  {participant.goals.map((goal) => (
                    <View key={goal} style={styles.goalPill}>
                      <Text style={styles.goalPillText}>{goal}</Text>
                    </View>
                  ))}
                </View>
              )}

              {showLifestyleLine && (
                <Text style={styles.profileLine}>
                  {EXERCISE_PHRASE[participant.exercise_frequency!]} ·{" "}
                  {participant.smoking ? "Smoker" : "Non-smoker"} ·{" "}
                  {ALCOHOL_PHRASE[participant.alcohol_drinks_per_week!]}
                </Text>
              )}
            </View>
          )}

          <View style={styles.completionBlock}>
            <Text style={styles.completionLabel}>{completionPercent}% complete</Text>
            <ProgressBar value={completionPercent} tone="teal" />
          </View>

          <View style={styles.zone}>
            <GradientOverlay stops={ZONE_GRADIENT_STOPS} style={styles.zoneGradient} />
            <View style={styles.zoneRows}>
              {progress &&
                CAPTURE_SECTIONS.map((section, i) => {
                  const IconComp = SECTION_ICON[section.id];
                  const state = deriveSectionState(progress, section);
                  return (
                    <React.Fragment key={section.id}>
                      {i > 0 && <View style={styles.divider} />}
                      <HubSectionCard
                        icon={IconComp}
                        title={section.label}
                        description={SECTION_DESCRIPTION[section.id]}
                        state={state}
                        onPress={() => router.push(section.route as never)}
                      />
                    </React.Fragment>
                  );
                })}
            </View>
          </View>
        </Card>
      </ScrollView>
    </CaptureFlowStepper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing["2xl"],
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
  outerCard: {
    marginTop: spacing.xl,
  },
  profileBlock: {
    marginBottom: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileHeading: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  profileLine: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  goalsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  goalPill: {
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.tealTint,
  },
  goalPillText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.tealDark,
  },
  completionBlock: {
    gap: spacing.sm,
  },
  completionLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  zone: {
    marginTop: spacing["2xl"],
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  zoneGradient: {
    borderRadius: radii.xl,
  },
  zoneRows: {
    padding: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.lg,
  },
});
