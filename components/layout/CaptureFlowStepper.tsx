import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Lock, Check } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { getOnboardingProgressAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CAPTURE_SECTIONS, deriveSectionState, type CaptureSectionId } from "@/lib/onboarding/flow";
import type { OnboardingProgress } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

export interface CaptureFlowStepperProps {
  /** Which hub section this screen belongs to — highlighted in the shortcut row. Omit on the hub itself. */
  activeSection?: CaptureSectionId;
  children: React.ReactNode;
  /** Disables all taps (e.g. during the Calculating screen's animation). */
  disabled?: boolean;
}

/**
 * Persistent, tappable progress shortcut for every screen in the Data Capture
 * hub-and-spoke sub-flow (hub, Questionnaire pair, the middle trio, ReCOGnAIze,
 * Calculating). Tapping a segment jumps straight to that section, except
 * ReCOGnAIze, which stays locked until the middle trio are all done.
 */
export function CaptureFlowStepper({ activeSection, children, disabled = false }: CaptureFlowStepperProps) {
  const router = useRouter();
  const { participantId } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    if (!participantId) return;
    let cancelled = false;
    function load() {
      getOnboardingProgressAction(participantId!).then((p) => {
        if (!cancelled) setProgress(p);
      });
    }
    load();
    return repository.subscribe(load);
  }, [participantId]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GradientOrb tone="teal" size={280} style={styles.orbTopLeft} />
      <GradientOrb tone="amber" size={260} style={styles.orbBottomRight} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={colors.ink} />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.stepLabel}>Data Capture</Text>
      </View>

      <View style={styles.shortcutRow}>
        {CAPTURE_SECTIONS.map((section) => {
          const state = progress ? deriveSectionState(progress, section) : "available";
          const isActive = section.id === activeSection;
          const isLocked = state === "locked";
          return (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.pill,
                state === "done" && styles.pillDone,
                state === "in_progress" && styles.pillInProgress,
                isLocked && styles.pillLocked,
                isActive && styles.pillActive,
              ]}
              disabled={disabled || isLocked}
              onPress={() => router.push(section.route as never)}
              activeOpacity={0.7}
            >
              {state === "done" ? (
                <Check size={11} color={colors.white} />
              ) : isLocked ? (
                <Lock size={11} color={colors.inkMuted} />
              ) : null}
              <Text
                style={[
                  styles.pillLabel,
                  state === "done" && styles.pillLabelDone,
                  isLocked && styles.pillLabelLocked,
                  isActive && styles.pillLabelActive,
                ]}
                numberOfLines={1}
              >
                {section.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
    overflow: "hidden",
  },
  orbTopLeft: { top: -80, left: -100, opacity: 0.5 },
  orbBottomRight: { bottom: -60, right: -100, opacity: 0.4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  backLabel: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.labelMd, color: colors.ink },
  stepLabel: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.caption, color: colors.inkMuted },
  shortcutRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  pillDone: { backgroundColor: colors.teal },
  pillInProgress: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  pillLocked: { backgroundColor: colors.surfaceMuted, opacity: 0.6 },
  pillActive: { borderColor: colors.ink },
  pillLabel: { fontFamily: fontFamilies.bodySemiBold, fontSize: 11, color: colors.inkMuted },
  pillLabelDone: { color: colors.white },
  pillLabelLocked: { color: colors.inkMuted },
  pillLabelActive: { color: colors.ink },
  content: { flex: 1 },
});
