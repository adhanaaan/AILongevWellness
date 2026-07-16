import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { FileEdit, Watch, PersonStanding, FileText, Brain } from "lucide-react-native";
import { OnboardingStepper } from "@/components/layout/OnboardingStepper";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { CaptureChannelCard } from "@/components/participant/CaptureChannelCard";
import {
  updateCaptureChannelAction,
  submitCaptureAction,
  DEMO_PARTICIPANT_ID,
} from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import type { CaptureChannel, CaptureChannelName } from "@/lib/types/db";
import { colors, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

const CHANNEL_META: Record<
  CaptureChannelName,
  {
    title: string;
    description: string;
    sourceTag: string;
    IconComponent: any;
    completeLabel: string;
    incompleteLabel: string;
    highlight?: boolean;
  }
> = {
  manual: {
    title: "Manual & questionnaire",
    description: "Self-reported history and lifestyle questions.",
    sourceTag: "Manual",
    IconComponent: FileEdit,
    completeLabel: "Edit answers",
    incompleteLabel: "Start questionnaire",
  },
  wearables: {
    title: "Wearables",
    description: "Connect your device for heart rate, sleep and activity.",
    sourceTag: "Wearable",
    IconComponent: Watch,
    completeLabel: "Manage connection",
    incompleteLabel: "Connect",
  },
  body_composition: {
    title: "Body composition scan",
    description: "Upload a scan or enter values from the retreat kiosk.",
    sourceTag: "Body comp",
    IconComponent: PersonStanding,
    completeLabel: "View values",
    incompleteLabel: "Enter values",
  },
  lab_report: {
    title: "Screening / lab reports",
    description: "Upload a PDF or photo — we'll extract the values for you.",
    sourceTag: "Lab",
    IconComponent: FileText,
    completeLabel: "View report",
    incompleteLabel: "Upload PDF or photo",
  },
  recognize: {
    title: "ReCOGnAIze",
    description: "A short cognitive assessment for your mental pillar.",
    sourceTag: "AI Tech",
    IconComponent: Brain,
    completeLabel: "View results",
    incompleteLabel: "Start assessment",
    highlight: true,
  },
};

export default function CapturePage() {
  const router = useRouter();
  const [channels, setChannels] = useState<CaptureChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    repository.getCaptureChannels(DEMO_PARTICIPANT_ID).then((c) => {
      setChannels(c);
      setLoading(false);
    });
  }, []);

  const completion =
    channels.length > 0
      ? channels.reduce(
          (sum, c) =>
            sum +
            (c.status === "complete" ? 1 : c.status === "partial" ? 0.5 : 0),
          0
        ) / channels.length
      : 0;
  const allComplete = channels.every((c) => c.status === "complete");
  const pct = Math.round(completion * 100);

  async function completeChannel(channel: CaptureChannelName) {
    const updated = await updateCaptureChannelAction(
      DEMO_PARTICIPANT_ID,
      channel,
      { status: "complete", entered_by: "participant" }
    );
    setChannels((prev) =>
      prev.map((c) => (c.channel === channel ? updated : c))
    );
  }

  async function submit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await submitCaptureAction(DEMO_PARTICIPANT_ID);
      router.replace("/(tabs)/card");
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <OnboardingStepper>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </OnboardingStepper>
    );
  }

  return (
    <OnboardingStepper>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Data Capture</Text>
        <Text style={styles.subtitle}>
          Complete each channel to build your wellness snapshot.
        </Text>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <ProgressBar value={pct} />
        </View>

        <View style={styles.cards}>
          {channels.map((c) => {
            const meta = CHANNEL_META[c.channel];
            const IconComp = meta.IconComponent;
            return (
              <CaptureChannelCard
                key={c.channel}
                icon={
                  <IconComp
                    size={20}
                    color={meta.highlight ? colors.white : colors.tealDark}
                  />
                }
                title={meta.title}
                description={meta.description}
                sourceTag={meta.sourceTag}
                enteredBy={c.entered_by}
                status={c.status}
                actionLabel={
                  c.status === "complete"
                    ? meta.completeLabel
                    : meta.incompleteLabel
                }
                onAction={() => {
                  if (c.status !== "complete") completeChannel(c.channel);
                }}
                highlight={meta.highlight}
              />
            );
          })}
        </View>

        <Text style={styles.hint}>
          Wearable data syncs automatically once connected — no need to re-enter
          it here.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {submitError && <Text style={styles.error}>{submitError}</Text>}
        <Button
          size="lg"
          disabled={!allComplete || submitting}
          onPress={submit}
        >
          Review my snapshot
        </Button>
      </View>
    </OnboardingStepper>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: fontSizes.bodyMd, color: colors.inkMuted },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.headlineMd,
    fontWeight: fontWeights.bold,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  progressSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.inkMuted,
  },
  progressPct: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.teal,
  },
  cards: { marginTop: spacing.lg, gap: spacing.md },
  hint: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  footer: { paddingHorizontal: spacing["2xl"], paddingVertical: spacing.lg },
  error: {
    fontSize: fontSizes.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
