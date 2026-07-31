import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Watch, HeartPulse, Moon, Activity, UploadCloud, Smartphone, User, ChevronRight, Share2 } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card } from "@/components/ui/Card";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { updateSectionStatusAction, updateCaptureChannelAction, uploadFileAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { extractWearableExport } from "@/lib/ai/client";
import { validateUploadSize } from "@/lib/data/uploadLimits";
import { colors, fontFamilies, fontSizes, radii, spacing, teal } from "@/lib/theme/tokens";

const POINTS = [
  { Icon: HeartPulse, label: "Heart rate & HRV" },
  { Icon: Moon, label: "Sleep duration & quality" },
  { Icon: Activity, label: "Daily activity" },
];

const STEPS = [
  { Icon: Smartphone, text: "Open the Health app on your phone." },
  { Icon: User, text: "Tap your profile icon in the top right." },
  { Icon: ChevronRight, text: 'Scroll down and tap "Export All Health Data".' },
  { Icon: Share2, text: "Share the resulting file and upload it here." },
];

const BUTTON_GRADIENT_STOPS = [
  { offset: "0", color: teal[200] },
  { offset: "1", color: teal[400] },
];

export default function CaptureWearablesIntroPage() {
  const router = useRouter();
  const { participantId, session } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditing = mode === "edit";
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishUp() {
    if (!participantId) return;
    setProcessing(true);
    // Mocked processing state — in mock mode there's no real extraction call to
    // wait on, so this just gives the participant a brief, honest "working on it"
    // beat before we mark the section done.
    await new Promise((resolve) => setTimeout(resolve, 400));
    await updateCaptureChannelAction(participantId, "wearables", {
      status: "complete",
      entered_by: "participant",
    });
    if (isEditing) {
      // Reached from outside onboarding (e.g. Tracking tab, post-onboarding) —
      // onboarding progress is a per-session in-memory record on the real backend
      // (doesn't survive a reload), so marking a section "done" here could throw
      // if it's no longer in the unlocked list. Just go back to wherever this
      // was opened from.
      router.back();
    } else {
      await updateSectionStatusAction("wearables", "done", participantId);
      router.replace("/onboarding/capture");
    }
  }

  async function onPickFile() {
    if (!participantId) return;
    setError(null);

    if (!isSupabaseConfigured) {
      // No backend configured — skip the real picker/upload and simulate the
      // processing state so the flow can still be completed end to end in the
      // sandbox/demo. finishUp() shows the "Processing…" beat itself.
      await finishUp();
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/zip", "application/x-zip-compressed"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    setUploading(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const sizeError = validateUploadSize("apple_health_export", blob.size);
      if (sizeError) {
        setError(sizeError);
        setUploading(false);
        return;
      }
      const fileRecord = await uploadFileAction(participantId, "apple_health_export", {
        blob,
        filename: asset.name,
        contentType: asset.mimeType ?? (Platform.OS === "web" ? blob.type : undefined),
      });

      if (session?.access_token) {
        extractWearableExport(session.access_token, participantId, fileRecord.id).catch(() => {
          // Extraction failure isn't fatal to capture — the care team can retry
          // from the admin screen.
        });
      }

      await finishUp();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || processing;

  return (
    <CaptureFlowStepper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <Watch size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Wearables</Text>
        <Text style={styles.subtitle}>
          We&apos;d like to connect your wearable data from Apple Health. It gives us a fuller
          picture of your day-to-day patterns alongside your labs and questionnaire answers.
        </Text>

        <Card padding="lg" style={styles.pointsCard}>
          <Text style={styles.pointsHeading}>What this feeds into</Text>
          <Text style={styles.pointsBody}>
            Your export includes key metrics like heart rate, sleep, activity, and HRV.
            These roll up into your Vascular, Metabolic, and Mental pillar scores.
          </Text>
          <View style={styles.pointsList}>
            {POINTS.map(({ Icon, label }) => (
              <View key={label} style={styles.pointRow}>
                <View style={styles.pointIcon}>
                  <Icon size={16} color={colors.tealDark} />
                </View>
                <Text style={styles.pointLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <GlassCard tint="light" padding="none" radius="full" style={StyleSheet.flatten([styles.headerIcon, styles.secondHeaderIcon])}>
          <UploadCloud size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Export & Upload</Text>
        <Text style={styles.subtitle}>
          Apple Health keeps your data on your phone, so we&apos;ll walk you through a
          quick export you can upload here.
        </Text>

        <Card padding="lg" style={styles.stepsCard}>
          {STEPS.map(({ Icon, text }, i) => (
            <View key={text} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Icon size={18} color={colors.tealDark} style={styles.stepIcon} />
              <Text style={styles.stepText}>{text}</Text>
            </View>
          ))}
        </Card>

        {processing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.teal} />
            <Text style={styles.processingText}>Processing your export…</Text>
          </View>
        ) : null}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.gradientButton, busy && styles.gradientButtonDisabled]}
          onPress={onPickFile}
          disabled={busy}
          activeOpacity={0.8}
        >
          <GradientOverlay stops={BUTTON_GRADIENT_STOPS} style={styles.gradientButtonFill} />
          <Text style={styles.gradientButtonText}>
            {uploading ? "Uploading…" : processing ? "Processing…" : "Choose export file"}
          </Text>
        </TouchableOpacity>
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
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  secondHeaderIcon: {
    marginTop: spacing["3xl"],
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
  pointsCard: {
    marginTop: spacing["2xl"],
    gap: spacing.md,
  },
  pointsHeading: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  pointsBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  pointsList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pointIcon: {
    width: 32,
    height: 32,
    borderRadius: spacing.md,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  pointLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  stepsCard: {
    marginTop: spacing["2xl"],
    gap: spacing.lg,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.tealDark,
  },
  stepIcon: {
    marginLeft: -spacing.xs,
  },
  stepText: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
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
  error: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.danger,
    marginTop: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
  gradientButton: {
    borderRadius: radii.lg,
    overflow: "hidden",
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientButtonDisabled: {
    opacity: 0.6,
  },
  gradientButtonFill: {
    borderRadius: radii.lg,
  },
  gradientButtonText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyLg,
    color: colors.tealDark,
  },
});
