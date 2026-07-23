import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { repository } from "@/lib/data/mock";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

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
      const [participant, pipeline] = await Promise.all([
        repository.getParticipant(participantId),
        repository.getPipeline(participantId),
      ]);
      if (cancelled || !participant || !pipeline) return;
      if (participant.name === "New participant") {
        router.replace("/onboarding/profile");
      } else if (pipeline.state === "capturing") {
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
        style={[styles.heroWrap, { height: windowHeight * 0.5 }]}
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

      <View style={styles.logoRow}>
        <Image
          source={require("@/assets/images/aiw-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.container}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>
            Your Executive Health Intelligence
          </Text>
          <Text style={styles.subtitle}>
            Get personalised insights under 30 minutes.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button size="lg" onPress={() => router.push("/onboarding/consent")}>
            Begin Assessment
          </Button>
          <Text style={styles.hint}>
            Your data is encrypted and handled in accordance with our privacy
            policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
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
  logoRow: {
    alignItems: "center",
    marginTop: -40,
  },
  logo: {
    width: 200,
    height: 112,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  textBlock: {
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.ink,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.md,
    lineHeight: 24,
  },
  actions: {
    width: "100%",
    gap: spacing.md,
    alignItems: "center",
    marginTop: spacing["3xl"],
  },
  hint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 18,
  },
});
