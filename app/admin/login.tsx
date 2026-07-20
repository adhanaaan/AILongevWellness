import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontSizes, spacing } from "@/lib/theme/tokens";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, signUpCareTeam, role } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        router.replace("/admin");
      } else {
        const hasSession = await signUpCareTeam(email.trim(), password);
        if (hasSession) {
          router.replace("/admin");
        } else {
          setAwaitingConfirmation(true);
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
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconWrap}>
          <ShieldCheck size={28} color={colors.sageDark} />
        </View>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to {email.trim()}. Click it, then come
          back and sign in.
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
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.iconWrap}>
        <ShieldCheck size={28} color={colors.sageDark} />
      </View>
      <Text style={styles.title}>Care team access</Text>
      <Text style={styles.subtitle}>
        {mode === "signin"
          ? "Sign in with your care team account to review participant data."
          : "Create a care team account (GP or TCM reviewer)."}
      </Text>

      <Card style={styles.card}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@clinic.example"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 6 characters"
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {role === "participant" && (
          <Text style={styles.error}>
            That account is registered as a participant, not care team.
          </Text>
        )}

        <Button
          size="lg"
          disabled={submitting || !email.trim() || password.length < 6}
          onPress={onSubmit}
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={() => {
            setError(null);
            setMode((m) => (m === "signin" ? "signup" : "signin"));
          }}
        >
          {mode === "signin"
            ? "New team member? Create an account"
            : "Already have an account? Sign in"}
        </Button>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bone },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["4xl"],
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.xs,
    marginBottom: spacing["2xl"],
  },
  card: {
    gap: spacing.lg,
  },
  error: {
    fontSize: fontSizes.caption,
    color: colors.danger,
  },
});
