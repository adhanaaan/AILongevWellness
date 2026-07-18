import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Activity } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { colors, fontFamilies, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Activity size={28} color={colors.teal} />
          </View>
          <Text style={styles.brand}>EXECUTIVE HEALTH</Text>
          <Text style={styles.title}>
            Your Executive{"\n"}Health Intelligence
          </Text>
          <Text style={styles.subtitle}>
            A comprehensive wellness assessment powered by AI — personalised
            insights in about 30 minutes.
          </Text>
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
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.navy,
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(42, 175, 170, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["3xl"],
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
