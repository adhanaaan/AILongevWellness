import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { colors, fontFamilies, fontSizes, lineHeights, spacing, teal } from "@/lib/theme/tokens";

const AUTO_ADVANCE_MS = 2500;

const BACKGROUND_STOPS = [
  { offset: "0", color: teal[600] },
  { offset: "1", color: teal[700] },
];

export default function ProfileCongratsPage() {
  const router = useRouter();
  const advanced = useRef(false);

  function advance() {
    if (advanced.current) return;
    advanced.current = true;
    router.replace("/onboarding/capture");
  }

  useEffect(() => {
    const timer = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.page}>
      <Pressable style={styles.fill} onPress={advance}>
        <GradientOverlay stops={BACKGROUND_STOPS} />
        <GradientOrb tone="amber" size={280} style={styles.orb} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            <GlassCard tint="dark" padding="none" radius="full" style={styles.iconBadge}>
              <Check size={28} color={colors.inkOnDark} />
            </GlassCard>
            <Text style={styles.title}>Congratulations!</Text>
            <Text style={styles.subtitle}>
              Your profile is ready. Next, let's capture a bit of health data
              for your wellness snapshot.
            </Text>
          </View>
        </SafeAreaView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
    overflow: "hidden",
    backgroundColor: teal[700],
  },
  fill: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  orb: {
    top: -60,
    right: -80,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
  },
  iconBadge: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["2xl"],
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.inkOnDark,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyLg,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: lineHeights.bodyLg,
  },
});
