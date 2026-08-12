import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { colors, fontFamilies, fontSizes, lineHeights, spacing, teal } from "@/lib/theme/tokens";

const AUTO_ADVANCE_MS = 3000;

const BACKGROUND_STOPS = [
  { offset: "0", color: teal[600] },
  { offset: "1", color: teal[700] },
];

export default function IntroHookPage() {
  const router = useRouter();
  const advanced = useRef(false);

  function advance() {
    if (advanced.current) return;
    advanced.current = true;
    router.replace("/onboarding/intro-longevity");
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
        <GradientOrb tone="amber" size={300} style={styles.orbTop} />
        <GradientOrb tone="teal" size={320} style={styles.orbBottom} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            <GlassCard tint="dark" padding="none" radius="full" style={styles.iconBadge}>
              <Sparkles size={28} color={colors.inkOnDark} />
            </GlassCard>
            <Text style={styles.title}>We live in{"\n"}a busy world.</Text>
            <Text style={styles.subtitle}>
              Pause for a moment, and reflect on your own longevity.
            </Text>
          </View>
          <Text style={styles.tapHint}>Tap to continue</Text>
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
  orbTop: {
    top: -70,
    right: -90,
    opacity: 0.5,
  },
  orbBottom: {
    bottom: -110,
    left: -120,
    opacity: 0.35,
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
    marginBottom: spacing["3xl"],
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 40,
    lineHeight: 46,
    color: colors.inkOnDark,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyLg,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: lineHeights.bodyLg,
    maxWidth: 300,
  },
  tapHint: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    letterSpacing: 0.5,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    paddingBottom: spacing["2xl"],
  },
});
