import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Mail, Check } from "lucide-react-native";
import { OnboardingStepper } from "@/components/layout/OnboardingStepper";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const CONSENT_ITEMS = [
  {
    key: "wellness",
    title: "Wellness programme",
    description:
      "I understand this is a wellness programme, not a medical diagnosis or treatment plan.",
  },
  {
    key: "reviewed",
    title: "Care team review",
    description:
      "I consent to my data being reviewed by the care team (GP and TCM practitioner) for personalised wellness insights.",
  },
  {
    key: "privacy",
    title: "Privacy & data handling",
    description:
      "I have read and agree to the privacy terms and data handling policy.",
  },
];

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
  const [consentChecked, setConsentChecked] = useState<Record<string, boolean>>({});

  const allConsentChecked = CONSENT_ITEMS.every((item) => consentChecked[item.key]);

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

        {mode === "signup" && (
          <View style={styles.consentItems}>
            {CONSENT_ITEMS.map((item) => {
              const isChecked = Boolean(consentChecked[item.key]);
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() =>
                    setConsentChecked((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key],
                    }))
                  }
                  activeOpacity={0.8}
                >
                  <GlassCard
                    tint="light"
                    padding="md"
                    radius="2xl"
                    tintColor={isChecked ? "rgba(42,175,170,0.16)" : undefined}
                    tintBorderColor={isChecked ? colors.teal : undefined}
                  >
                    <View style={styles.consentRow}>
                      <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                        {isChecked && <Check size={14} color={colors.white} />}
                      </View>
                      <View style={styles.consentContent}>
                        <Text style={styles.consentTitle}>{item.title}</Text>
                        <Text style={styles.consentDescription}>{item.description}</Text>
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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
          disabled={
            submitting ||
            !email.trim() ||
            password.length < 6 ||
            (mode === "signup" && !allConsentChecked)
          }
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
  consentItems: {
    marginTop: spacing["2xl"],
    gap: spacing.md,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  consentContent: {
    flex: 1,
  },
  consentTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  consentDescription: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
});
