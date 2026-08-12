import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Mail } from "lucide-react-native";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const passwordsMismatch =
    mode === "signup" && confirmPassword.length > 0 && password !== confirmPassword;

  async function onContinue() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const hasSession = await signUpParticipant(email.trim(), password);
        if (hasSession) {
          router.push("/onboarding/capture");
        } else {
          setAwaitingConfirmation(true);
        }
      } else {
        await signIn(email.trim(), password);
        if (isSupabaseConfigured) {
          // Bounce through "/" rather than assuming completion — its landing
          // effect is progress-aware and is the single source of truth for
          // where a signed-in participant belongs (mirrors the email-
          // confirmation-link precedent in app/index.tsx).
          router.replace("/");
        } else {
          router.push("/(tabs)/card");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.scrollContent}>
          <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
            <Mail size={24} color={colors.teal} />
          </GlassCard>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {email.trim()}. Click it, then come
            back and sign in below.
          </Text>
          <View style={styles.confirmAction}>
            <Button
              variant="secondary"
              size="lg"
              onPress={() => {
                setAwaitingConfirmation(false);
                setMode("signin");
              }}
            >
              Back to sign in
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
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
          {mode === "signup" && (
            <Input
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter your password"
              error={passwordsMismatch ? "Passwords don't match." : undefined}
            />
          )}
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
        {mode === "signup" && (
          <Text style={styles.legal}>
            By creating an account, you agree to our terms and acknowledge our
            privacy policy.
          </Text>
        )}
        <Button
          size="lg"
          disabled={
            submitting ||
            !email.trim() ||
            password.length < 6 ||
            (mode === "signup" && password !== confirmPassword)
          }
          onPress={onContinue}
        >
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bone,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
  },
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
  confirmAction: {
    marginTop: spacing["2xl"],
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
  legal: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
});
