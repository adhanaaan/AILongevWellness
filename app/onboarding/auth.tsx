import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Mail, Check } from "lucide-react-native";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { TermsModal } from "@/components/ui/TermsModal";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

// Consent (previously a separate 3-checkbox screen) is folded into sign-up as a
// single acknowledgment that opens the full terms — the legal points live in the
// modal body; consent_given is still recorded by AuthProvider on first auth.
const PRIVACY_POLICY_BODY = `We take the security of your wellness data seriously. This summary explains what we collect, how it's used, and who can see it during your time in the programme.

What we collect
We collect the information you provide during onboarding (profile, goals, lifestyle), any wearable, body composition, or lab data you choose to upload, and your ongoing check-ins inside the app.

How it's used
Your data is used to generate your personal wellness snapshot and to support the suggested discussion points your care team prepares for you. We never use your data for any purpose outside this programme.

Who can see it
Your assigned GP and TCM practitioner review your wellness snapshot before it's shared with you. No one outside your care team has access to your individual data.

This is a wellness programme — it provides wellness insights, not a medical diagnosis or treatment plan.

Data handling
All data is encrypted in transit and at rest. You can request a copy of your data or ask for it to be deleted at any time by contacting the programme team.

By accepting, you confirm you've read this summary and agree to how your data will be handled during the programme.`;

export default function ParticipantAuthPage() {
  const router = useRouter();
  const { signIn, signUpParticipant } = useAuth();
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"signup" | "signin">(
    initialMode === "signin" ? "signin" : "signup"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
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
          router.push("/onboarding/quiz");
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
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        {mode === "signup" && (
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setConsent((c) => !c)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
              {consent && <Check size={14} color={colors.white} strokeWidth={3} />}
            </View>
            <Text style={styles.consentText}>
              I agree this is a wellness programme (not medical care), consent to my care team
              reviewing my data, and accept the{" "}
              <Text style={styles.consentLink} onPress={() => setTermsOpen(true)}>
                privacy &amp; data terms
              </Text>
              .
            </Text>
          </TouchableOpacity>
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
            (mode === "signup" && !consent)
          }
          onPress={onContinue}
        >
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </View>

      <TermsModal
        visible={termsOpen}
        title="Privacy & Data Handling"
        body={PRIVACY_POLICY_BODY}
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          setConsent(true);
          setTermsOpen(false);
        }}
      />
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  consentText: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  consentLink: {
    fontFamily: fontFamilies.bodySemiBold,
    color: colors.teal,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
});
