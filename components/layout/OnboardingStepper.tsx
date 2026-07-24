import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

// Personal Info/Goals/Lifestyle and Capture now live inside the Data Capture
// hub-and-spoke sub-flow (see CaptureFlowStepper) — this linear stepper only
// covers the screens before account verification.
const STEPS = [
  { href: "/", label: "Welcome" },
  { href: "/onboarding/consent", label: "Consent" },
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GradientOrb tone="teal" size={280} style={styles.orbTopLeft} />
      <GradientOrb tone="amber" size={260} style={styles.orbBottomRight} />
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={colors.ink} />
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={styles.stepLabel}>
          Step {activeIndex + 1} of {STEPS.length}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        {STEPS.map((step, i) => (
          <View
            key={step.href}
            style={[
              styles.progressSegment,
              i <= activeIndex
                ? styles.segmentActive
                : styles.segmentInactive,
            ]}
          />
        ))}
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
  orbTopLeft: {
    top: -80,
    left: -100,
    opacity: 0.5,
  },
  orbBottomRight: {
    bottom: -60,
    right: -100,
    opacity: 0.4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  backLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  backPlaceholder: {
    width: 60,
  },
  stepLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
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
  content: {
    flex: 1,
  },
});
