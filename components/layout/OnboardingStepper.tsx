import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { colors } from "@/lib/theme/tokens";

const STEPS = [
  { href: "/", label: "Welcome" },
  { href: "/onboarding/consent", label: "Consent" },
  { href: "/onboarding/profile", label: "Profile" },
  { href: "/onboarding/capture", label: "Capture" },
];

interface OnboardingStepperProps {
  children: React.ReactNode;
}

export function OnboardingStepper({ children }: OnboardingStepperProps) {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.href === pathname)
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.dots}>
        {STEPS.map((step, i) => (
          <View
            key={step.href}
            style={[
              styles.dot,
              i === activeIndex
                ? styles.dotActive
                : i < activeIndex
                ? styles.dotDone
                : styles.dotFuture,
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
    backgroundColor: colors.bone,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.sage,
  },
  dotDone: {
    width: 16,
    backgroundColor: colors.sageDark,
  },
  dotFuture: {
    width: 16,
    backgroundColor: colors.surfaceMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
});
