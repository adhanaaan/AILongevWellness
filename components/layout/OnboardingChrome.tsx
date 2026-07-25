import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export interface OnboardingChromeProps {
  /** Right-aligned header label — e.g. "Step 2 of 3" or "Data Capture". */
  label: string;
  /** Omit to hide the back button (e.g. the first step of a linear flow). */
  onBack?: () => void;
  /** The progress indicator rendered below the header — a segment track or a pill row. */
  progressRow?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared chrome for every onboarding screen: SafeAreaView, gradient-orb
 * background, and the back-button/header-label row. OnboardingStepper and
 * CaptureFlowStepper each layer their own progress indicator on top via
 * `progressRow`.
 */
export function OnboardingChrome({ label, onBack, progressRow, children }: OnboardingChromeProps) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GradientOrb tone="teal" size={280} style={styles.orbTopLeft} />
      <GradientOrb tone="amber" size={260} style={styles.orbBottomRight} />
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <ChevronLeft size={20} color={colors.ink} />
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={styles.stepLabel}>{label}</Text>
      </View>
      {progressRow}
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
  backPlaceholder: { width: 60 },
  stepLabel: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.caption, color: colors.inkMuted },
  content: { flex: 1 },
});
