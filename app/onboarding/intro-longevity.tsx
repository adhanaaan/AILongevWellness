import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Infinity as InfinityIcon } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, fontFamilies, fontSizes, lineHeights, spacing } from "@/lib/theme/tokens";

export default function IntroLongevityPage() {
  const router = useRouter();

  return (
    <View style={styles.page}>
      <GradientOrb tone="teal" size={280} style={styles.orbTopLeft} />
      <GradientOrb tone="amber" size={260} style={styles.orbBottomRight} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <GlassCard tint="light" padding="none" radius="full" style={styles.iconBadge}>
            <InfinityIcon size={28} color={colors.terracotta} />
          </GlassCard>
          <Text style={styles.title}>What is longevity, really?</Text>
          <Text style={styles.body}>
            It&rsquo;s not just how long you live. It&rsquo;s how well your
            vascular, metabolic, and mental health work together over time.
          </Text>
          <Text style={styles.benefit}>
            You&rsquo;ll get a clear, personalised wellness snapshot, reviewed
            by your care team.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            size="lg"
            style={styles.getStartedButton}
            onPress={() => router.push("/onboarding/consent")}
          >
            Get started
          </Button>
        </View>
      </SafeAreaView>
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
    backgroundColor: colors.bone,
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
  safe: {
    flex: 1,
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
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyLg,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: lineHeights.bodyLg,
  },
  benefit: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: lineHeights.bodyMd,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.lg,
  },
  getStartedButton: {
    width: "100%",
  },
});
