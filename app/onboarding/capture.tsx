import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { FileEdit, Watch, PersonStanding, FileText, Brain, ClipboardList } from "lucide-react-native";
import { OnboardingStepper } from "@/components/layout/OnboardingStepper";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { CaptureChannelCard } from "@/components/participant/CaptureChannelCard";
import {
  updateCaptureChannelAction,
  submitCaptureAction,
  uploadFileAction,
} from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { extractLabReport, extractWearableExport, generateDraft } from "@/lib/ai/client";
import type { CaptureChannel, CaptureChannelName, FileKind } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const FILE_KIND_BY_CHANNEL: Partial<Record<CaptureChannelName, FileKind>> = {
  lab_report: "lab_report",
  body_composition: "body_comp",
  wearables: "apple_health_export",
};

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
    description:
      "Upload your Apple Health export — we'll extract your heart rate, sleep, and activity data.",
    sourceTag: "Wearable",
    IconComponent: Watch,
    completeLabel: "View data",
    incompleteLabel: "Upload Apple Health export",
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
  const { participantId, session } = useAuth();
  const [channels, setChannels] = useState<CaptureChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadingChannel, setUploadingChannel] = useState<CaptureChannelName | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!participantId) return;
    repository.getCaptureChannels(participantId).then((c) => {
      setChannels(c);
      setLoading(false);
    });
  }, [participantId]);

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
    if (!participantId) return;
    const updated = await updateCaptureChannelAction(
      participantId,
      channel,
      { status: "complete", entered_by: "participant" }
    );
    setChannels((prev) =>
      prev.map((c) => (c.channel === channel ? updated : c))
    );
  }

  async function uploadForChannel(channel: CaptureChannelName) {
    if (!participantId) return;
    const kind = FILE_KIND_BY_CHANNEL[channel];
    if (!kind || !isSupabaseConfigured) {
      completeChannel(channel);
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type:
        kind === "apple_health_export"
          ? ["application/zip", "application/x-zip-compressed"]
          : ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    setUploadError(null);
    setUploadingChannel(channel);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileRecord = await uploadFileAction(participantId, kind, {
        blob,
        filename: asset.name,
        contentType: asset.mimeType ?? (Platform.OS === "web" ? blob.type : undefined),
      });
      await completeChannel(channel);
      // Lab reports and Apple Health exports both get extracted in the background —
      // extraction failure isn't fatal to capture, so we don't block or alarm the
      // participant if it fails; the care team can retry from the admin screen.
      if (kind === "lab_report" && session?.access_token) {
        extractLabReport(session.access_token, participantId, fileRecord.id).catch(() => {});
      } else if (kind === "apple_health_export" && session?.access_token) {
        extractWearableExport(session.access_token, participantId, fileRecord.id).catch(() => {});
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploadingChannel(null);
    }
  }

  async function submit() {
    if (!participantId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await submitCaptureAction(participantId);
      // Turns the just-submitted capture into an actual draft health card (scores,
      // bio age, narrative) — the participant won't see it until care team signs
      // off and releases it, so this doesn't need to block navigation.
      if (isSupabaseConfigured && session?.access_token) {
        generateDraft(session.access_token, participantId).catch(() => {
          // Care team can retry generation manually from the admin review queue.
        });
      }
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
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <ClipboardList size={24} color={colors.teal} />
        </GlassCard>
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
                enteredBy={
                  c.entered_by === "participant"
                    ? "You"
                    : c.entered_by === "admin"
                    ? "Care team"
                    : "Not yet entered"
                }
                status={c.status}
                actionLabel={
                  uploadingChannel === c.channel
                    ? "Uploading…"
                    : c.status === "complete"
                    ? meta.completeLabel
                    : meta.incompleteLabel
                }
                onAction={() => {
                  if (c.status !== "complete" && uploadingChannel === null) {
                    uploadForChannel(c.channel);
                  }
                }}
                highlight={meta.highlight}
              />
            );
          })}
        </View>

        {uploadError && <Text style={styles.error}>{uploadError}</Text>}

        <Text style={styles.hint}>
          To export your Apple Health data: open the Health app on your phone,
          tap your profile icon, then "Export All Health Data".
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
  loadingText: { fontFamily: fontFamilies.body, fontSize: fontSizes.bodyMd, color: colors.inkMuted },
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
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  progressPct: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.teal,
  },
  cards: { marginTop: spacing.lg, gap: spacing.md },
  hint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  footer: { paddingHorizontal: spacing["2xl"], paddingVertical: spacing.lg },
  error: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
