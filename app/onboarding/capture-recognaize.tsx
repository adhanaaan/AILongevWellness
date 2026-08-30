import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Brain, Sparkles, Timer } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card } from "@/components/ui/Card";
import { updateSectionStatusAction, updateCaptureChannelAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { submitCognitiveResult, submitMentalQuestionnaire } from "@/lib/ai/client";
import { MentalQuestionnaire } from "@/components/onboarding/MentalQuestionnaire";
import { SymbolDigitGame, type SymbolDigitResult } from "@/components/onboarding/SymbolDigitGame";
import { SDMT_DURATION_SECONDS } from "@/lib/ai/symbolDigit";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

// Mental capture: the validated WHO-5 + PSS-4 questionnaire first, then the
// Symbol-Digit matching game (ReCOGnAIze — ported from recognaizelite lite-two),
// which derives the cognitive composite fed into the Mental pillar.
type Phase = "questionnaire" | "intro" | "game" | "submitting" | "results";

export default function CaptureRecognaizePage() {
  const router = useRouter();
  const { participantId, session } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditing = mode === "edit";

  const [phase, setPhase] = useState<Phase>("questionnaire");
  const [qSubmitting, setQSubmitting] = useState(false);
  const [qError, setQError] = useState<string | null>(null);
  const [result, setResult] = useState<(SymbolDigitResult & { cog_composite?: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onQuestionnaireComplete(who5: number[], pss4: number[]) {
    if (!isSupabaseConfigured || !participantId || !session?.access_token) {
      setPhase("intro");
      return;
    }
    setQError(null);
    setQSubmitting(true);
    try {
      await submitMentalQuestionnaire(session.access_token, participantId, who5, pss4);
      setPhase("intro");
    } catch (e) {
      setQError(e instanceof Error ? e.message : "Couldn't save your answers — please try again.");
    } finally {
      setQSubmitting(false);
    }
  }

  async function finish() {
    try {
      if (participantId) {
        await updateCaptureChannelAction(participantId, "recognize", {
          status: "complete",
          entered_by: "participant",
        });
        if (!isEditing) {
          await updateSectionStatusAction("recognize", "done", participantId);
        }
      }
      if (isEditing) {
        router.back();
      } else {
        router.replace("/onboarding/capture-calculating");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save — please try again.");
    }
  }

  async function onGameComplete(res: SymbolDigitResult) {
    // The game is fully client-side; only submission needs the backend. In mock
    // mode (no Supabase) just show the local score and continue.
    if (!isSupabaseConfigured || !participantId || !session?.access_token) {
      setResult(res);
      setPhase("results");
      return;
    }
    setPhase("submitting");
    setError(null);
    try {
      const { cog_composite } = await submitCognitiveResult(
        session.access_token,
        participantId,
        res.correct,
        res.errors
      );
      setResult({ ...res, cog_composite });
    } catch (e) {
      setResult(res);
      setError(e instanceof Error ? e.message : "Couldn't save your results.");
    } finally {
      setPhase("results");
    }
  }

  if (phase === "questionnaire") {
    return (
      <CaptureFlowStepper>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
            <Brain size={24} color={colors.teal} />
          </GlassCard>
          <Text style={styles.title}>Mental health</Text>
          <Text style={styles.subtitle}>
            Two short, validated check-ins — the WHO-5 Well-Being Index and the PSS-4 stress scale —
            that feed your Mental pillar. Next comes ReCOGnAIze, a quick symbol-matching test.
          </Text>
          <View style={styles.questionnaireWrap}>
            <MentalQuestionnaire
              onComplete={onQuestionnaireComplete}
              submitting={qSubmitting}
              error={qError}
            />
          </View>
        </ScrollView>
      </CaptureFlowStepper>
    );
  }

  if (phase === "game") {
    return (
      <CaptureFlowStepper showBackButton={false}>
        <View style={styles.gameWrap}>
          <SymbolDigitGame onComplete={onGameComplete} />
        </View>
      </CaptureFlowStepper>
    );
  }

  return (
    <CaptureFlowStepper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <Brain size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>ReCOGnAIze</Text>
        <Text style={styles.subtitle}>
          A quick symbol-matching test of how fast your brain processes — it feeds your Mental
          pillar alongside your questionnaire, wearables, and lab data.
        </Text>

        {phase === "intro" && (
          <Card padding="lg" style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <View style={styles.noticeIcon}>
                <Sparkles size={16} color={colors.tealDark} />
              </View>
              <Text style={styles.noticeHeading}>How it works</Text>
            </View>
            <Text style={styles.noticeBody}>
              You&apos;ll see a key that pairs each symbol with a number. One symbol shows at a
              time — tap its matching number as fast as you can. Match as many as you can in{" "}
              {SDMT_DURATION_SECONDS} seconds.
            </Text>
            <View style={styles.noticeHeader}>
              <View style={styles.noticeIcon}>
                <Timer size={16} color={colors.tealDark} />
              </View>
              <Text style={styles.noticeHeading}>{SDMT_DURATION_SECONDS} seconds</Text>
            </View>
          </Card>
        )}

        {phase === "submitting" && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.teal} />
            <Text style={styles.processingText}>Saving your results…</Text>
          </View>
        )}

        {phase === "results" && (
          <Card padding="lg" style={styles.noticeCard}>
            <Text style={styles.noticeHeading}>Your results</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Symbols matched</Text>
              <Text style={styles.resultValue}>{result?.correct ?? 0}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Net score</Text>
              <Text style={styles.resultValue}>{result?.score ?? 0}</Text>
            </View>
            {typeof result?.cog_composite === "number" && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Cognitive composite</Text>
                <Text style={styles.resultValue}>{result.cog_composite}/100</Text>
              </View>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {phase === "intro" && (
          <Button size="lg" onPress={() => setPhase("game")}>
            Start test
          </Button>
        )}
        {phase === "results" && (
          <Button size="lg" onPress={() => void finish()}>
            Continue
          </Button>
        )}
      </View>
    </CaptureFlowStepper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  gameWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  questionnaireWrap: { marginTop: spacing.xl },
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
  noticeCard: {
    marginTop: spacing["2xl"],
    gap: spacing.sm,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  noticeIcon: {
    width: 32,
    height: 32,
    borderRadius: spacing.md,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeHeading: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  noticeBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  processingText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
  },
  resultValue: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.ink,
  },
  error: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.danger,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
