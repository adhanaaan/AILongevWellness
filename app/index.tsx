import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions } from "react-native";
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

export default function WelcomePage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const { height: windowHeight } = useWindowDimensions();

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
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.logoRow}>
        <Image
          source={require("@/assets/images/aiw-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={[styles.heroWrap, { height: windowHeight * 0.42 }]}>
        <Image
          source={require("@/assets/images/splash-hero.jpg")}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <GradientOverlay stops={HERO_FADE_STOPS} />
      </View>

      <View style={styles.container}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>
            Your Executive Health Intelligence
          </Text>
          <Text style={styles.subtitle}>
            A comprehensive wellness assessment powered by AI — personalised
            insights in about 30 minutes.
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
  logoRow: {
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  logo: {
    width: 132,
    height: 74,
  },
  heroWrap: {
    width: "100%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  textBlock: {
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.ink,
    textAlign: "center",
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  actions: {
    width: "100%",
    gap: spacing.md,
    alignItems: "center",
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
