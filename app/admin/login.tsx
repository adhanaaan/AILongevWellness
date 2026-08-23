import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, spacing, radii, shadows } from "@/lib/theme/tokens";

// Sign-in only. Care-team accounts are NOT self-service — an administrator
// creates them out-of-band (see SETUP.md "Creating admin accounts": allowlist
// the email, then create the user in Supabase). This screen only lets an already
// provisioned care_team account sign in; there is no signup path to abuse.
export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // CareTeamGuard routes from here: a real care_team account lands in the
      // portal; anything else is bounced back to the consumer app.
      router.replace("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.brand}>AI Wellness · Admin Portal</Text>

      <View style={styles.iconWrap}>
        <ShieldCheck size={26} color={colors.sageDark} strokeWidth={1.75} />
      </View>
      <Text style={styles.title}>Care team access</Text>
      <Text style={styles.subtitle}>
        Sign in with the care team account provided to you. Accounts are created
        by your administrator — there is no public sign-up.
      </Text>

      <Card padding="lg" style={styles.card}>
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
          placeholder="Your password"
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
          Sign in
        </Button>
      </Card>

      <Text style={styles.footnote}>
        Secure access for authorised care team reviewers only. Need access? Ask
        your administrator to set up an account for you.
      </Text>
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
  brand: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.inkMuted,
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineMd,
    color: colors.charcoal,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    marginBottom: spacing["2xl"],
    lineHeight: 24,
  },
  card: {
    gap: spacing.lg,
    ...shadows.soft,
  },
  error: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.danger,
  },
  footnote: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing["2xl"],
    lineHeight: 18,
  },
});
