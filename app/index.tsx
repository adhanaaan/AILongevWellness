import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Activity, Clock, Sparkles, UserCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { VideoHero } from "@/components/ui/VideoHero";
import { HERO_VIDEO_SOURCE } from "@/lib/config/media";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { repository } from "@/lib/data/mock";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const TRUST_ITEMS = [
  { icon: Clock, label: "~30 minutes" },
  { icon: Sparkles, label: "AI-personalised" },
  { icon: UserCheck, label: "Care team reviewed" },
];

function AmbientFallback() {
  return (
    <>
      <GradientOrb tone="teal" size={420} style={styles.fallbackOrbTop} />
      <GradientOrb tone="amber" size={360} style={styles.fallbackOrbBottom} />
    </>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const { participantId } = useAuth();

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
    <VideoHero source={HERO_VIDEO_SOURCE} fallback={<AmbientFallback />}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.hero}>
            <View style={styles.iconWrap}>
              <GradientOrb tone="teal" size={200} />
              <GlassCard tint="dark" padding="none" radius="full" style={styles.iconCircle}>
                <Activity size={28} color={colors.teal} />
              </GlassCard>
            </View>
            <Text style={styles.brand}>EXECUTIVE HEALTH</Text>
            <Text style={styles.title}>
              Your Executive{"\n"}Health Intelligence
            </Text>
            <Text style={styles.subtitle}>
              A comprehensive wellness assessment powered by AI — personalised
              insights in about 30 minutes.
            </Text>

            <View style={styles.trustRow}>
              {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                <GlassCard
                  key={label}
                  tint="dark"
                  padding="sm"
                  radius="full"
                  style={styles.trustChip}
                >
                  <Icon size={13} color={colors.teal} />
                  <Text style={styles.trustLabel}>{label}</Text>
                </GlassCard>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              size="lg"
              onPress={() => router.push("/onboarding/consent")}
            >
              Begin Assessment
            </Button>
            <Text style={styles.hint}>
              Your data is encrypted and handled in accordance with our privacy
              policy.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </VideoHero>
  );
}

const styles = StyleSheet.create({
  fallbackOrbTop: {
    top: -100,
    left: "50%",
    marginLeft: -210,
  },
  fallbackOrbBottom: {
    bottom: -80,
    left: "50%",
    marginLeft: -180,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing["6xl"],
    paddingBottom: spacing["4xl"],
  },
  hero: {
    alignItems: "center",
    marginTop: spacing["6xl"],
  },
  iconWrap: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["3xl"],
  },
  iconCircle: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 3,
    color: colors.teal,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.inkOnDark,
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 24,
    maxWidth: 300,
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing["2xl"],
  },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  trustLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkOnDark,
  },
  actions: {
    width: "100%",
    gap: spacing.lg,
    alignItems: "center",
  },
  hint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 18,
  },
});
