import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { submitCaptureAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const STATUS_LINES = [
  "Structuring your data…",
  "Calculating pillar scores…",
  "Drafting your wellness summary…",
];

function statusForProgress(progress: number): string {
  if (progress < 34) return STATUS_LINES[0];
  if (progress < 67) return STATUS_LINES[1];
  return STATUS_LINES[2];
}

export default function CaptureCalculatingPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  // Step the progress bar from 0 -> 100 over ~3.5s, independent of the actual
  // submitCapture call — this is a perceived-progress animation, not a real
  // upload/processing percentage.
  useEffect(() => {
    const stepMs = 120;
    const increment = 4;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + increment);
        return next;
      });
    }, stepMs);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 100 || submittedRef.current) return;
    submittedRef.current = true;
    (async () => {
      try {
        await submitCaptureAction(participantId ?? undefined);
        router.replace("/(tabs)/card");
      } catch (e) {
        submittedRef.current = false;
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong while building your wellness summary."
        );
      }
    })();
  }, [progress, participantId, router]);

  if (error) {
    return (
      <CaptureFlowStepper disabled>
        <View style={styles.center}>
          <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
            <Sparkles size={24} color={colors.teal} />
          </GlassCard>
          <Text style={styles.title}>We hit a snag</Text>
          <Text style={styles.subtitle}>{error}</Text>
          <View style={styles.retryButton}>
            <Button size="lg" onPress={() => router.replace("/onboarding/capture")}>
              Try again
            </Button>
          </View>
        </View>
      </CaptureFlowStepper>
    );
  }

  return (
    <CaptureFlowStepper activeSection="recognize" disabled>
      <View style={styles.center}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <Sparkles size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Building your wellness summary</Text>
        <Text style={styles.subtitle}>{statusForProgress(progress)}</Text>

        <View style={styles.progressWrap}>
          <ProgressBar value={progress} />
        </View>
      </View>
    </CaptureFlowStepper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
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
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 24,
    textAlign: "center",
  },
  progressWrap: {
    width: "100%",
    marginTop: spacing["3xl"],
  },
  retryButton: {
    marginTop: spacing["2xl"],
    width: "100%",
  },
});
