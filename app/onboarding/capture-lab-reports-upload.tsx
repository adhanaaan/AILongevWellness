import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { UploadCloud, FileText, Camera, Activity } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card } from "@/components/ui/Card";
import { updateSectionStatusAction, updateCaptureChannelAction, uploadFileAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { extractLabReport } from "@/lib/ai/client";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const FORMATS = [
  { Icon: FileText, text: "A PDF of your lab results, screening, or panel." },
  { Icon: Camera, text: "A clear photo of a printed report." },
  { Icon: Activity, text: "A CGM (continuous glucose monitor) summary report." },
];

export default function CaptureLabReportsUploadPage() {
  const router = useRouter();
  const { participantId, session } = useAuth();
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
    await updateSectionStatusAction("lab_reports", "done", participantId);
    await updateCaptureChannelAction(participantId, "lab_report", {
      status: "complete",
      entered_by: "participant",
    });
    router.replace("/onboarding/capture");
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
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    setUploading(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileRecord = await uploadFileAction(participantId, "lab_report", {
        blob,
        filename: asset.name,
        contentType: asset.mimeType ?? (Platform.OS === "web" ? blob.type : undefined),
      });

      if (session?.access_token) {
        extractLabReport(session.access_token, participantId, fileRecord.id).catch(() => {
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
    <CaptureFlowStepper activeSection="lab_reports">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <UploadCloud size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Upload Your Report</Text>
        <Text style={styles.subtitle}>
          Choose a file from your device. Our AI reads the biomarker values and reference ranges
          directly off the page.
        </Text>

        <Card padding="lg" style={styles.formatsCard}>
          <Text style={styles.formatsHeading}>What we accept</Text>
          {FORMATS.map(({ Icon, text }) => (
            <View key={text} style={styles.formatRow}>
              <View style={styles.formatIcon}>
                <Icon size={16} color={colors.tealDark} />
              </View>
              <Text style={styles.formatText}>{text}</Text>
            </View>
          ))}
        </Card>

        {processing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.teal} />
            <Text style={styles.processingText}>Processing your report…</Text>
          </View>
        ) : null}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" disabled={busy} onPress={onPickFile}>
          {uploading ? "Uploading…" : processing ? "Processing…" : "Choose file"}
        </Button>
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
  formatsCard: {
    marginTop: spacing["2xl"],
    gap: spacing.lg,
  },
  formatsHeading: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  formatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  formatIcon: {
    width: 32,
    height: 32,
    borderRadius: spacing.md,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  formatText: {
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
});
