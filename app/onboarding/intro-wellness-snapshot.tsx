import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { ScoreRing } from "@/components/participant/ScoreRing";
import { DraftStatusBadge } from "@/components/participant/DraftStatusBadge";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { pillarStatus } from "@/lib/ai/scoring";
import type { AiDraft } from "@/lib/types/db";
import {
  colors,
  fontFamilies,
  fontSizes,
  lineHeights,
  radii,
  spacing,
} from "@/lib/theme/tokens";

// The consistent James Chen demo scores (see CLAUDE.md), shown as a generic
// example only if the real draft (below) doesn't arrive before POLL_ATTEMPTS
// runs out -- there's no signed card yet at this point in onboarding, so this
// is a fallback, not live data.
const PREVIEW_SCORES = [
  { key: "vascular", label: "Vascular", value: 74 },
  { key: "metabolic", label: "Metabolic", value: 68 },
  { key: "mental", label: "Mental", value: 81 },
] as const;

const POLL_INTERVAL_MS = 1500;
const POLL_ATTEMPTS = 10; // ~15s -- profile-lifestyle.tsx fires generateDraft
// fire-and-forget right before navigating here, so it's usually still running
// (a real Claude call) by the time this screen mounts.

export default function IntroWellnessSnapshotPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Polls for the real draft that was just kicked off, so this already-
  // mandatory transition screen can reveal the participant's own first
  // numbers the moment they're ready, instead of only ever showing a generic
  // demo card and making them go hunt for the real thing later.
  useEffect(() => {
    if (!participantId) return;
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      const draft = await repository.getAiDraft(participantId!);
      if (cancelled) return;
      if (draft) {
        setAiDraft(draft);
        return;
      }
      attempts += 1;
      if (attempts >= POLL_ATTEMPTS) {
        setTimedOut(true);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [participantId]);

  const isReady = Boolean(aiDraft);
  const isWaiting = !isReady && !timedOut;

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
          <Text style={styles.title}>
            {isReady ? "Your first wellness snapshot" : "Your wellness snapshot"}
          </Text>
          <Text style={styles.subtitle}>
            {isReady
              ? "Here are your real numbers, based on what you just told us."
              : "Here's a preview of what you'll get once your data is reviewed."}
          </Text>

          <Card padding="lg" style={styles.previewCard}>
            {isWaiting ? (
              <View style={styles.generatingRow}>
                <ActivityIndicator color={colors.sageDark} />
                <Text style={styles.generatingText}>Crunching your first numbers...</Text>
              </View>
            ) : (
              <>
                {!isReady && (
                  <View style={styles.previewRow}>
                    <View style={styles.previewBadge}>
                      <Text style={styles.previewBadgeText}>PREVIEW</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.previewTitle}>Your longevity snapshot</Text>
                <View style={styles.previewRings}>
                  {(isReady
                    ? [
                        { key: "vascular", label: "Vascular", value: aiDraft!.scores.vascular },
                        { key: "metabolic", label: "Metabolic", value: aiDraft!.scores.metabolic },
                        { key: "mental", label: "Mental", value: aiDraft!.scores.mental },
                      ]
                    : PREVIEW_SCORES
                  ).map((score) => (
                    <ScoreRing
                      key={score.key}
                      value={score.value}
                      label={score.label}
                      status={pillarStatus(score.value)}
                      size={64}
                    />
                  ))}
                </View>
                {isReady && (
                  <DraftStatusBadge
                    isDelivered={false}
                    missingCount={aiDraft!.missing_biomarkers?.length}
                  />
                )}
              </>
            )}
          </Card>

          <Text style={styles.overline}>ABOUT YOUR WELLNESS SNAPSHOT</Text>
          <Text style={styles.headline}>See your wellness, all in one place.</Text>
          <Text style={styles.body}>
            {isReady
              ? "This is your biological age and how you're doing across vascular, metabolic, and mental health, drafted from what you've shared so far. It'll sharpen as you add wearables, body composition, and labs, and your care team reviews it before anything is final."
              : "Once you finish capturing your data and your care team reviews it, you'll get a snapshot like this: your biological age, and how you're doing across vascular, metabolic, and mental health."}
          </Text>

          {!isReady && (
            <View style={styles.statusBlock}>
              <Text style={styles.statusLine}>
                {isWaiting
                  ? "Your first draft is generating in the background."
                  : "Your data capture isn't finished yet."}
              </Text>
              <Text style={styles.statusLine}>
                {isWaiting
                  ? "Keep going below and it'll be ready shortly."
                  : "Your snapshot will be ready once that review is signed off."}
              </Text>
            </View>
          )}
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
  generatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  generatingText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
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
