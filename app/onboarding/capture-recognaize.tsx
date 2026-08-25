import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Brain, Sparkles, Zap } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card } from "@/components/ui/Card";
import { updateSectionStatusAction, updateCaptureChannelAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { submitRecognizeResult, submitMentalQuestionnaire } from "@/lib/ai/client";
import { MentalQuestionnaire } from "@/components/onboarding/MentalQuestionnaire";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

const NUM_TRIALS = 5;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;

type Phase = "questionnaire" | "intro" | "waiting" | "go" | "too_soon" | "submitting" | "results";

export default function CaptureRecognaizePage() {
  const router = useRouter();
  const { participantId, session } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditing = mode === "edit";

  // The Mental capture is two parts: the validated WHO-5 + PSS-4 questionnaire
  // first, then the reaction-time test. Kept as sibling phases so recognaize-lite
  // can later swap the reaction-time half without disturbing the questionnaire.
  const [phase, setPhase] = useState<Phase>("questionnaire");
  const [qSubmitting, setQSubmitting] = useState(false);
  const [qError, setQError] = useState<string | null>(null);
  const [trials, setTrials] = useState<number[]>([]);
  const [result, setResult] = useState<{ reaction_time: number; cog_composite: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onQuestionnaireComplete(who5: number[], pss4: number[]) {
    // Mock mode (no backend) or no session: skip the write, proceed to the test —
    // mirrors onStartTest's mock handling.
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

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function armTrial() {
    setPhase("waiting");
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    timeoutRef.current = setTimeout(() => {
      goAtRef.current = Date.now();
      setPhase("go");
    }, delay);
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
        // ReCOGnAIze is the one section that doesn't return to the hub — it flows
        // straight into Calculating, so replace rather than push.
        router.replace("/onboarding/capture-calculating");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save — please try again.");
    }
  }

  function onStartTest() {
    if (!isSupabaseConfigured) {
      // No backend configured to submit results to — mirrors the other
      // capture-*-intro screens' mock-mode behavior of skipping the real
      // interaction and completing the section directly.
      void finish();
      return;
    }
    setError(null);
    setTrials([]);
    setResult(null);
    armTrial();
  }

  function onTapZonePress() {
    if (phase === "waiting") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase("too_soon");
      return;
    }
    if (phase === "go") {
      const elapsed = Date.now() - goAtRef.current;
      const next = [...trials, elapsed];
      setTrials(next);
      if (next.length >= NUM_TRIALS) {
        void submitResults(next);
      } else {
        armTrial();
      }
    }
  }

  async function submitResults(finalTrials: number[]) {
    setPhase("submitting");
    setError(null);
    if (!participantId || !session?.access_token) {
      setPhase("results");
      return;
    }
    try {
      const res = await submitRecognizeResult(session.access_token, participantId, finalTrials);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your results.");
    } finally {
      setPhase("results");
    }
  }

  const localAvg = trials.length > 0 ? Math.round(trials.reduce((a, b) => a + b, 0) / trials.length) : 0;

  if (phase === "questionnaire") {
    return (
      <CaptureFlowStepper>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
            <Brain size={24} color={colors.teal} />
          </GlassCard>
          <Text style={styles.title}>Mental wellbeing</Text>
          <Text style={styles.subtitle}>
            Two short, validated check-ins — the WHO-5 Well-Being Index and the PSS-4 stress scale —
            that feed your Mental pillar. Next comes a quick reaction-time test.
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

  if (phase === "waiting" || phase === "go") {
    return (
      <CaptureFlowStepper>
        <Pressable
          style={[styles.tapZone, phase === "go" ? styles.tapZoneGo : styles.tapZoneWaiting]}
          onPress={onTapZonePress}
        >
          <Text style={[styles.tapZoneTitle, phase === "go" && styles.tapZoneTitleGo]}>
            {phase === "go" ? "Tap now!" : "Wait for green…"}
          </Text>
          <Text style={[styles.tapZoneSubtitle, phase === "go" && styles.tapZoneSubtitleGo]}>
            {phase === "go" ? "Tap anywhere on the screen" : `Trial ${trials.length + 1} of ${NUM_TRIALS}`}
          </Text>
        </Pressable>
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
          ReCOGnAIze is a short reaction-time assessment that feeds into your Mental pillar
          score, alongside your questionnaire, wearables, and lab data.
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
              The screen will turn green at a random moment — tap anywhere as soon as it does.
              You&apos;ll do this {NUM_TRIALS} times; if you tap too early, that trial just
              restarts.
            </Text>
          </Card>
        )}

        {phase === "too_soon" && (
          <Card padding="lg" style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <View style={[styles.noticeIcon, styles.noticeIconWarning]}>
                <Zap size={16} color={colors.amberDark} />
              </View>
              <Text style={styles.noticeHeading}>Too soon</Text>
            </View>
            <Text style={styles.noticeBody}>
              You tapped before the screen turned green. That trial doesn&apos;t count — give it
              another go.
            </Text>
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
              <Text style={styles.resultLabel}>Average reaction time</Text>
              <Text style={styles.resultValue}>{result?.reaction_time ?? localAvg} ms</Text>
            </View>
            {result && (
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
          <Button size="lg" onPress={onStartTest}>
            Start test
          </Button>
        )}
        {phase === "too_soon" && (
          <Button size="lg" onPress={armTrial}>
            Try again
          </Button>
        )}
        {phase === "results" && error && !result && (
          <Button size="lg" onPress={() => void submitResults(trials)}>
            Retry saving
          </Button>
        )}
        {phase === "results" && (result || !error) && (
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
  },
  noticeIcon: {
    width: 32,
    height: 32,
    borderRadius: spacing.md,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeIconWarning: {
    backgroundColor: colors.amberLighter,
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
  tapZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  tapZoneWaiting: {
    backgroundColor: colors.ink,
  },
  tapZoneGo: {
    backgroundColor: colors.success,
  },
  tapZoneTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.inkOnDark,
    textAlign: "center",
  },
  tapZoneTitleGo: {
    color: colors.white,
  },
  tapZoneSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkOnDarkMuted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  tapZoneSubtitleGo: {
    color: "rgba(255,255,255,0.85)",
  },
});
