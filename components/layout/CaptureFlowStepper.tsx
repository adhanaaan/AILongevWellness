import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, spacing } from "@/lib/theme/tokens";

export interface CaptureFlowStepperProps {
  children: React.ReactNode;
}

/**
 * Shared full-bleed shell for every screen in the Data Capture hub-and-spoke
 * sub-flow (hub, Questionnaire pair, the middle trio, ReCOGnAIze, Calculating):
 * a plain icon-only back button plus decorative gradient orbs. Cross-section
 * jump navigation lives on the hub itself (its own section list), not here.
 */
export function CaptureFlowStepper({ children }: CaptureFlowStepperProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GradientOrb tone="teal" size={280} style={styles.orbTopLeft} />
      <GradientOrb tone="amber" size={260} style={styles.orbBottomRight} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={colors.ink} />
        </TouchableOpacity>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
});
