import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScanLine } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { colors, fontSizes } from "@/lib/theme/tokens";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>AI WELLNESS</Text>
        <Text style={styles.title}>Your personalised longevity snapshot</Text>
        <Text style={styles.subtitle}>
          A guided wellness check — about 30 minutes.
        </Text>

        <View style={styles.actions}>
          <Button
            size="lg"
            onPress={() => router.push("/onboarding/consent")}
          >
            Begin
          </Button>
          <Button
            size="lg"
            variant="secondary"
            iconLeft={<ScanLine size={18} color={colors.sage} />}
            onPress={() => router.push("/onboarding/consent")}
          >
            Scan the retreat QR code to start
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brand: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    letterSpacing: 2,
    color: colors.sageDark,
  },
  title: {
    fontSize: fontSizes.headlineLg,
    fontWeight: "600",
    color: colors.charcoal,
    textAlign: "center",
    marginTop: 16,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 280,
  },
  actions: {
    width: "100%",
    maxWidth: 320,
    marginTop: 40,
    gap: 12,
  },
});
