import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ShieldCheck, ShieldOff, Database } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { updateParticipantAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Participant } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

const DATA_HELD = [
  "The profile and questionnaire answers you entered during onboarding.",
  "Any lab reports, body-composition scans, or wearable exports you uploaded.",
  "Your wellness scores, care plan, and daily check-ins.",
];

export default function PrivacyPage() {
  const router = useRouter();
  const { participantId, signOut } = useAuth();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!participantId) return;
    repository.getParticipant(participantId).then(setParticipant);
  }, [participantId]);

  const withdrawn = Boolean(participant?.consent_withdrawn_at);

  async function doWithdraw() {
    if (!participantId) return;
    setError(null);
    setBusy(true);
    try {
      await updateParticipantAction(participantId, {
        consent_given: false,
        consent_withdrawn_at: new Date().toISOString(),
      });
      // Sign out so processing stops from the participant's side. The care team
      // sees the withdrawal on the admin detail page and handles data per the
      // retreat's policy — withdrawal here does not auto-delete anything.
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't withdraw consent — please try again.");
      setBusy(false);
    }
  }

  function confirmWithdraw() {
    Alert.alert(
      "Withdraw consent?",
      "You'll be signed out and your care team will be notified to stop processing your data. Your existing data isn't deleted automatically — to request deletion, contact your care team. You can consent again by signing up.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Withdraw consent", style: "destructive", onPress: doWithdraw },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />}
          onPress={() => router.back()}
        >
          Back
        </Button>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Privacy & consent</Text>
        <Text style={styles.subtitle}>
          You control the wellness data you share with us. Here's what we hold and how to
          withdraw your consent.
        </Text>

        <Card padding="lg" style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.iconCircle, withdrawn && styles.iconCircleWarn]}>
              {withdrawn ? (
                <ShieldOff size={18} color={colors.danger} />
              ) : (
                <ShieldCheck size={18} color={colors.sageDark} />
              )}
            </View>
            <View style={styles.statusText}>
              {withdrawn ? (
                <>
                  <Text style={styles.statusTitle}>Consent withdrawn</Text>
                  <Text style={styles.statusMeta}>
                    Withdrawn {formatDate(participant!.consent_withdrawn_at!)}. Your care team
                    has been notified.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.statusTitle}>Consent active</Text>
                  <Text style={styles.statusMeta}>
                    {participant?.consented_at
                      ? `You agreed to the wellness consent terms on ${formatDate(participant.consented_at)}.`
                      : "You agreed to the wellness consent terms during onboarding."}
                  </Text>
                </>
              )}
            </View>
          </View>
        </Card>

        <Text style={styles.sectionLabel}>What we hold</Text>
        <Card padding="lg" style={styles.dataCard}>
          {DATA_HELD.map((item) => (
            <View key={item} style={styles.dataRow}>
              <Database size={16} color={colors.sageDark} style={styles.dataIcon} />
              <Text style={styles.dataText}>{item}</Text>
            </View>
          ))}
        </Card>

        {!withdrawn && (
          <>
            <Text style={styles.sectionLabel}>Withdraw consent</Text>
            <Card padding="lg" style={styles.withdrawCard}>
              <Text style={styles.withdrawBody}>
                Withdrawing signs you out and tells your care team to stop processing your
                data. Nothing is deleted automatically — to request deletion, contact your
                care team.
              </Text>
              {error && <Text style={styles.error}>{error}</Text>}
              <Button
                variant="secondary"
                iconLeft={<ShieldOff size={16} color={colors.danger} />}
                onPress={confirmWithdraw}
                disabled={busy}
              >
                {busy ? "Withdrawing…" : "Withdraw consent"}
              </Button>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["3xl"],
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineLg,
    color: colors.charcoal,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  statusCard: {},
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleWarn: {
    backgroundColor: colors.dangerTint,
  },
  statusText: { flex: 1 },
  statusTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  statusMeta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  sectionLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  dataCard: { gap: spacing.md },
  dataRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  dataIcon: { marginTop: 2 },
  dataText: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.charcoal,
    lineHeight: 20,
  },
  withdrawCard: { gap: spacing.lg },
  withdrawBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  error: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.danger,
  },
});
