import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { ScoreRing } from "@/components/participant/ScoreRing";
import { pillarStatus } from "@/lib/ai/scoring";
import {
  colors,
  fontFamilies,
  fontSizes,
  lineHeights,
  radii,
  spacing,
} from "@/lib/theme/tokens";

// The consistent James Chen demo scores (see CLAUDE.md), shown as an example
// of what a completed wellness snapshot looks like -- there's no signed card
// yet at this point in onboarding, so this is a preview, not live data.
const PREVIEW_SCORES = [
  { key: "vascular", label: "Vascular", value: 74 },
  { key: "metabolic", label: "Metabolic", value: 68 },
  { key: "mental", label: "Mental", value: 81 },
] as const;

export default function IntroWellnessSnapshotPage() {
  const router = useRouter();

  return (
    <View style={styles.page}>
      <GradientOrb tone="teal" size={260} style={styles.orbTop} />
      <GradientOrb tone="amber" size={220} style={styles.orbBottom} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Your wellness snapshot</Text>
          <Text style={styles.subtitle}>
            Here's a preview of what you'll get once your data is reviewed.
          </Text>

          <Card padding="lg" style={styles.previewCard}>
            <View style={styles.previewRow}>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>PREVIEW</Text>
              </View>
            </View>

            <Text style={styles.previewTitle}>Your longevity snapshot</Text>
            <View style={styles.previewRings}>
              {PREVIEW_SCORES.map((score) => (
                <ScoreRing
                  key={score.key}
                  value={score.value}
                  label={score.label}
                  status={pillarStatus(score.value)}
                  size={64}
                />
              ))}
            </View>
          </Card>

          <Text style={styles.overline}>ABOUT YOUR WELLNESS SNAPSHOT</Text>
          <Text style={styles.headline}>See your wellness, all in one place.</Text>
          <Text style={styles.body}>
            Once you finish capturing your data and your care team reviews it,
            you'll get a snapshot like this: your biological age, and how
            you're doing across vascular, metabolic, and mental health.
          </Text>

          <View style={styles.statusBlock}>
            <Text style={styles.statusLine}>
              Your data capture isn't finished yet.
            </Text>
            <Text style={styles.statusLine}>
              Your snapshot will be ready once that review is signed off.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            size="lg"
            style={styles.continueButton}
            onPress={() => router.push("/onboarding/capture")}
          >
            Continue
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
  orbTop: {
    top: -70,
    right: -80,
    opacity: 0.5,
  },
  orbBottom: {
    bottom: -60,
    left: -90,
    opacity: 0.4,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineMd,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  previewCard: {
    marginTop: spacing["2xl"],
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.md,
  },
  previewBadge: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
  },
  previewBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1,
    color: colors.inkMuted,
  },
  previewTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  previewRings: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  overline: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1.2,
    color: colors.sageDark,
    marginTop: spacing["3xl"],
    marginBottom: spacing.sm,
  },
  headline: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    lineHeight: lineHeights.headlineLg,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    lineHeight: lineHeights.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  statusBlock: {
    marginTop: spacing["2xl"],
    gap: spacing.xs,
  },
  statusLine: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    lineHeight: lineHeights.labelMd,
    color: colors.inkMuted,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
  continueButton: {
    width: "100%",
  },
});
