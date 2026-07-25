import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Lock, Check } from "lucide-react-native";
import { OnboardingChrome } from "@/components/layout/OnboardingChrome";
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
 * hub-and-spoke sub-flow (hub, Create Profile, Wellness & Lifestyle, the
 * middle trio, ReCOGnAIze, Calculating). Tapping a segment jumps straight to
 * that section, except ReCOGnAIze, which stays locked until the middle trio
 * are all done.
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
    <OnboardingChrome
      label="Data Capture"
      onBack={() => router.back()}
      progressRow={
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
      }
    >
      {children}
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
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
});
