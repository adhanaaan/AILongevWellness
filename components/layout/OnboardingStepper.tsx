import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { OnboardingChrome } from "@/components/layout/OnboardingChrome";
import { colors, spacing } from "@/lib/theme/tokens";

// Personal Info/Goals/Lifestyle and Capture now live inside the Data Capture
// hub-and-spoke sub-flow (see CaptureFlowStepper) — this linear stepper only
// covers the screens before account creation.
const STEPS = [
  { href: "/", label: "Welcome" },
  { href: "/onboarding/intro", label: "Intro" },
  { href: "/onboarding/auth", label: "Account" },
];

interface OnboardingStepperProps {
  children: React.ReactNode;
}

export function OnboardingStepper({ children }: OnboardingStepperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.href === pathname)
  );
  const canGoBack = activeIndex > 0;

  return (
    <OnboardingChrome
      label={`Step ${activeIndex + 1} of ${STEPS.length}`}
      onBack={canGoBack ? () => router.back() : undefined}
      progressRow={
        <View style={styles.progressTrack}>
          {STEPS.map((step, i) => (
            <View
              key={step.href}
              style={[
                styles.progressSegment,
                i <= activeIndex ? styles.segmentActive : styles.segmentInactive,
              ]}
            />
          ))}
        </View>
      }
    >
      {children}
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  segmentActive: {
    backgroundColor: colors.teal,
  },
  segmentInactive: {
    backgroundColor: colors.border,
  },
});
