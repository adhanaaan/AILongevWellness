import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Infinity as InfinityIcon } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, fontFamilies, fontSizes, lineHeights, radii, spacing } from "@/lib/theme/tokens";

const PILLARS = [
  { label: "Vascular", color: colors.vascular },
  { label: "Metabolic", color: colors.metabolic },
  { label: "Mental", color: colors.mental },
] as const;

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
          <Text style={styles.eyebrow}>THE LONGEVITY VIEW</Text>
          <Text style={styles.title}>What is longevity,{"\n"}really?</Text>
          <Text style={styles.body}>
            It&rsquo;s not just how long you live. It&rsquo;s how well your
            vascular, metabolic, and mental health work together over time.
          </Text>
          <View style={styles.pillars}>
            {PILLARS.map((pillar) => (
              <View key={pillar.label} style={styles.pillarChip}>
                <View style={[styles.pillarDot, { backgroundColor: pillar.color }]} />
                <Text style={styles.pillarLabel}>{pillar.label}</Text>
              </View>
            ))}
          </View>
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
  eyebrow: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fontSizes.overline,
    letterSpacing: 2,
    color: colors.terracottaInk,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 40,
    lineHeight: 46,
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyLg,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: lineHeights.bodyLg,
    maxWidth: 320,
  },
  pillars: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing["2xl"],
  },
  pillarChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillarDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    marginRight: spacing.sm,
  },
  pillarLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  benefit: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
    textAlign: "center",
    marginTop: spacing["2xl"],
    lineHeight: lineHeights.bodyMd,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.lg,
  },
  getStartedButton: {
    width: "100%",
  },
});
