import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export interface CaptureFlowStepperProps {
  children: React.ReactNode;
  /** Hides the back button — only the hub itself should pass false. */
  showBackButton?: boolean;
}

/**
 * Shared full-bleed shell for every screen in the Data Capture hub-and-spoke
 * sub-flow (hub, Questionnaire pair, the middle trio, ReCOGnAIze, Calculating):
 * a labeled back-to-hub button plus decorative gradient orbs. Cross-section
 * jump navigation lives on the hub itself (its own section list), not here.
 */
export function CaptureFlowStepper({ children, showBackButton = true }: CaptureFlowStepperProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GradientOrb tone="teal" size={280} style={styles.orbTopLeft} />
      <GradientOrb tone="amber" size={260} style={styles.orbBottomRight} />
      {showBackButton && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/onboarding/capture")}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={20} color={colors.ink} />
            <Text style={styles.backLabel}>Back to Data Capture</Text>
          </TouchableOpacity>
        </View>
      )}

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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  backLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  content: { flex: 1 },
});
