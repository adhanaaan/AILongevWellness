import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { ScoreRing } from "@/components/participant/ScoreRing";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { repository } from "@/lib/data/mock";
import { isCaptureComplete } from "@/lib/onboarding/flow";
import { pillarStatus } from "@/lib/ai/scoring";
import { colors, fontFamilies, fontSizes, lineHeights, radii, spacing } from "@/lib/theme/tokens";

// The consistent James Chen demo scores (see CLAUDE.md) shown as a static
// "mock up of longevity data" over the hero photo -- a preview of what the
// programme produces, not live data (there's no signed-in participant yet).
const SNAPSHOT_SCORES = [
  { key: "vascular", label: "Vascular", value: 74 },
  { key: "metabolic", label: "Metabolic", value: 68 },
  { key: "mental", label: "Mental", value: 81 },
] as const;

const HERO_FADE_STOPS = [
  { offset: "0", color: "rgba(250,250,250,0)" },
  { offset: "0.55", color: "rgba(250,250,250,0)" },
  { offset: "1", color: colors.cloud },
];

// Native aspect ratio of assets/images/splash-hero.jpg (1000x1675). The image
// is rendered at full (uncropped) height for this ratio and shifted up so the
// crop window starts just above her hairline (~11.6% down the source photo)
// rather than resizeMode="cover"'s default center-crop, which cut off her
// face. react-native-web doesn't honor the `aspectRatio` style on Image, so
// width/height are computed explicitly from a measured layout width instead.
const HERO_IMAGE_ASPECT_RATIO = 1000 / 1675;
const HERO_TOP_CROP_FRACTION = 195 / 1675;

export default function WelcomePage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const [heroWidth, setHeroWidth] = useState(0);

  function onHeroLayout(e: LayoutChangeEvent) {
    setHeroWidth(e.nativeEvent.layout.width);
  }

  // Lands here whenever a signed-in participant hits the root — most notably
  // right after clicking an email confirmation link, which otherwise would
  // leave them stranded on the marketing screen instead of continuing where
  // they left off (profile, capture, or their card).
  useEffect(() => {
    if (!isSupabaseConfigured || !participantId) return;
    let cancelled = false;
    (async () => {
      const [participant, pipeline, progress] = await Promise.all([
        repository.getParticipant(participantId),
        repository.getPipeline(participantId),
        repository.getOnboardingProgress(participantId),
      ]);
      if (cancelled || !participant || !pipeline) return;
      // The Data Capture hub (now living at /onboarding/capture) is the landing
      // point for any still-capturing participant, brand new or not — it routes
      // on to Personal Info itself if the Questionnaire hasn't been started yet.
      // The isCaptureComplete check catches a participant whose pipeline state
      // has already advanced while their capture data genuinely isn't done.
      if (pipeline.state === "capturing" || !isCaptureComplete(progress)) {
        router.replace("/onboarding/capture");
      } else {
        router.replace("/(tabs)/card");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [participantId, router]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View
        style={[styles.heroWrap, { height: windowHeight * 0.34 }]}
        onLayout={onHeroLayout}
      >
        {heroWidth > 0 && (
          <Image
            source={require("@/assets/images/splash-hero.jpg")}
            style={[
              styles.heroImage,
              {
                width: heroWidth,
                height: heroWidth / HERO_IMAGE_ASPECT_RATIO,
                top: -(heroWidth / HERO_IMAGE_ASPECT_RATIO) * HERO_TOP_CROP_FRACTION,
              },
            ]}
          />
        )}
        <GradientOverlay stops={HERO_FADE_STOPS} />
      </View>

      <View style={styles.snapshotRow}>
        <Card padding="lg" style={styles.snapshotCard}>
          <View style={styles.snapshotHeader}>
            <Text style={styles.snapshotTitle}>Your longevity snapshot</Text>
            <View style={styles.previewPill}>
              <Text style={styles.previewPillText}>PREVIEW</Text>
            </View>
          </View>
          <View style={styles.snapshotRings}>
            {SNAPSHOT_SCORES.map((score) => (
              <ScoreRing
                key={score.key}
                value={score.value}
                label={score.label}
                status={pillarStatus(score.value)}
                size={56}
              />
            ))}
          </View>
          <View style={styles.snapshotDivider} />
          <Text style={styles.snapshotCaption}>
            Biological age 54 — four years younger than 58
          </Text>
        </Card>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/aiw-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.container}>
          <View style={styles.textBlock}>
            <Text style={styles.eyebrow}>EMBRACING LONGEVITY</Text>
            <Text style={styles.title}>
              Your Executive{"\n"}Health Intelligence
            </Text>
            <Text style={styles.subtitle}>
              All your wellness data in one place, reviewed by your care team.
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              size="lg"
              style={styles.getStartedButton}
              onPress={() => router.push({ pathname: "/onboarding/auth", params: { mode: "signup" } })}
            >
              Get started
            </Button>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/onboarding/auth", params: { mode: "signin" } })}
              activeOpacity={0.7}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkLead}>Already a member? </Text>
              <Text style={styles.loginLinkText}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
    overflow: "hidden",
  },
  heroWrap: {
    width: "100%",
    overflow: "hidden",
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  snapshotRow: {
    paddingHorizontal: spacing["2xl"],
    marginTop: -56,
  },
  snapshotCard: {
    width: "100%",
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  snapshotTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  previewPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.tealTint,
  },
  previewPillText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    color: colors.teal,
  },
  snapshotRings: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  snapshotDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  snapshotCaption: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
  },
  logoRow: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  logo: {
    width: 170,
    height: 95,
  },
  container: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  textBlock: {
    marginTop: spacing.sm,
    alignItems: "center",
  },
  eyebrow: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fontSizes.overline,
    letterSpacing: 2,
    color: colors.teal,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 38,
    color: colors.ink,
    lineHeight: 44,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyLg,
    color: colors.inkMuted,
    marginTop: spacing.md,
    lineHeight: lineHeights.bodyLg,
    textAlign: "center",
    maxWidth: 320,
  },
  actions: {
    width: "100%",
    gap: spacing.lg,
    alignItems: "center",
    marginTop: spacing["3xl"],
  },
  getStartedButton: {
    width: "100%",
  },
  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  loginLinkLead: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
  },
  loginLinkText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.teal,
  },
});
