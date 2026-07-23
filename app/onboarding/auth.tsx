import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Mail } from "lucide-react-native";
import { OnboardingStepper } from "@/components/layout/OnboardingStepper";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export default function ParticipantAuthPage() {
  const router = useRouter();
  const { signIn, signUpParticipant } = useAuth();
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"signup" | "signin">(
    initialMode === "signin" ? "signin" : "signup"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function onContinue() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const hasSession = await signUpParticipant(email.trim(), password);
        if (hasSession) {
          router.push("/onboarding/profile");
        } else {
          setAwaitingConfirmation(true);
        }
      } else {
        await signIn(email.trim(), password);
        router.push("/(tabs)/card");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <OnboardingStepper>
        <View style={styles.scrollContent}>
          <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
            <Mail size={24} color={colors.teal} />
          </GlassCard>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {email.trim()}. Click it, then come
            back and sign in below.
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setAwaitingConfirmation(false);
              setMode("signin");
            }}
          >
            Back to sign in
          </Button>
        </View>
      </OnboardingStepper>
    );
  }

  return (
    <OnboardingStepper>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <Mail size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "signup"
            ? "Set up your login to keep your wellness data with you across devices."
            : "Sign in to continue where you left off."}
        </Text>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters"
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Button
          variant="ghost"
          size="sm"
          onPress={() => {
            setError(null);
            setMode((m) => (m === "signup" ? "signin" : "signup"));
          }}
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </Button>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          size="lg"
          disabled={submitting || !email.trim() || password.length < 6}
          onPress={onContinue}
        >
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </View>
    </OnboardingStepper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
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
  form: {
    gap: spacing.lg,
    marginTop: spacing["2xl"],
  },
  error: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.danger,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
});
