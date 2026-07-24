import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ClipboardList, Watch, PersonStanding, FileText, Brain } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { HubSectionCard } from "@/components/participant/HubSectionCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { getOnboardingProgressAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CAPTURE_SECTIONS, deriveSectionState, type CaptureSectionId } from "@/lib/onboarding/flow";
import type { OnboardingProgress } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const SECTION_ICON: Record<CaptureSectionId, any> = {
  questionnaire: ClipboardList,
  wearables: Watch,
  body_composition: PersonStanding,
  lab_reports: FileText,
  recognize: Brain,
};

const SECTION_DESCRIPTION: Record<CaptureSectionId, string> = {
  questionnaire: "A few questions about you and your lifestyle.",
  wearables: "Connect your Apple Health data.",
  body_composition: "Capture body composition metrics.",
  lab_reports: "Upload a recent lab report for AI extraction.",
  recognize: "A short cognitive assessment.",
};

export default function CaptureHubPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    if (!participantId) return;
    function load() {
      getOnboardingProgressAction(participantId!).then(setProgress);
    }
    load();
    return repository.subscribe(load);
  }, [participantId]);

  return (
    <CaptureFlowStepper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <ClipboardList size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Data Capture</Text>
        <Text style={styles.subtitle}>
          Complete each section to build your wellness snapshot. Start with the Questionnaire —
          the rest unlock as you go.
        </Text>

        <View style={styles.cards}>
          {progress &&
            CAPTURE_SECTIONS.map((section) => {
              const IconComp = SECTION_ICON[section.id];
              const state = deriveSectionState(progress, section);
              return (
                <HubSectionCard
                  key={section.id}
                  icon={<IconComp size={20} color={colors.tealDark} />}
                  title={section.label}
                  description={SECTION_DESCRIPTION[section.id]}
                  state={state}
                  onPress={() => router.push(section.route as never)}
                />
              );
            })}
        </View>
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
  cards: { marginTop: spacing.xl, gap: spacing.md },
});
