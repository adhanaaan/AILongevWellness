import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Dna, ShieldCheck, Eye, FileCheck2 } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card } from "@/components/ui/Card";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { validateUploadSize } from "@/lib/data/uploadLimits";
import { uploadFileAction, listFilesAction } from "@/lib/data/actions";
import { fileDisplayName } from "@/lib/onboarding/useChannelUpload";
import type { FileRecord } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing, teal } from "@/lib/theme/tokens";

// Genetic report upload — deliberately STORE-ONLY. A genetic/DNA screening isn't
// a lab panel and interpreting one is a clinical act, not wellness, so this never
// runs extraction or scoring (unlike the other capture channels). The file is
// stored privately for the participant's care team to review. It's optional and
// never gates onboarding (see the hub — it sits outside CAPTURE_SECTIONS).

const POINTS = [
  { Icon: Eye, label: "Only your care team can view it" },
  { Icon: ShieldCheck, label: "Never auto-analysed or scored by AI" },
];

const BUTTON_GRADIENT_STOPS = [
  { offset: "0", color: teal[200] },
  { offset: "1", color: teal[400] },
];

export default function CaptureGeneticIntroPage() {
  const router = useRouter();
  const { participantId, session } = useAuth();
  const { fromQuiz } = useLocalSearchParams<{ fromQuiz?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);

  const loadFiles = useCallback(async () => {
    if (!participantId || !isSupabaseConfigured) return;
    try {
      const all = await listFilesAction(participantId);
      setFiles(all.filter((f) => f.kind === "genetic_report"));
    } catch {
      /* non-fatal */
    }
  }, [participantId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const leave = useCallback(() => {
    if (fromQuiz === "1")
      router.replace({ pathname: "/onboarding/capture", params: { fromQuiz: "1" } });
    else router.replace("/onboarding/capture");
  }, [fromQuiz, router]);

  const pickAndUpload = useCallback(async () => {
    if (!participantId) return;
    setError(null);
    setNotice(null);

    if (!isSupabaseConfigured) {
      // No backend (demo/sandbox): simulate a stored file.
      setBusy(true);
      await new Promise((r) => setTimeout(r, 400));
      setBusy(false);
      setNotice("Saved. Your care team will be able to view this.");
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    setBusy(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const sizeError = validateUploadSize("genetic_report", blob.size);
      if (sizeError) {
        setError(sizeError);
        return;
      }

      await uploadFileAction(participantId, "genetic_report", {
        blob,
        filename: asset.name,
        contentType: asset.mimeType ?? (Platform.OS === "web" ? blob.type : undefined),
      });
      await loadFiles();
      setNotice("Saved. Your care team will be able to view this — it isn't analysed automatically.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [participantId, session, loadFiles]);

  return (
    <CaptureFlowStepper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <Dna size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Genetic report</Text>
        <Text style={styles.subtitle}>
          Have a genetic or DNA screening report? Share it here so your care team can review it
          alongside the rest of your picture.
        </Text>

        <Card padding="lg" style={styles.pointsCard}>
          <Text style={styles.pointsHeading}>How we handle it</Text>
          <Text style={styles.pointsBody}>
            A genetic report is sensitive and isn&apos;t a routine lab test, so we don&apos;t run it
            through AI. We simply store it privately for your care team to read.
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

        <Text style={styles.formatHint}>Accepted: a PDF or a photo of your report.</Text>

        {files.length > 0 && (
          <View style={styles.filesWrap}>
            <Text style={styles.filesHeading}>
              {files.length === 1 ? "Uploaded file" : `Uploaded files · ${files.length}`}
            </Text>
            {files.map((f) => (
              <View key={f.id} style={styles.fileRow}>
                <FileCheck2 size={16} color={colors.success} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {fileDisplayName(f.storage_path)}
                </Text>
                <Text style={styles.fileStatus}>Stored</Text>
              </View>
            ))}
          </View>
        )}

        {busy ? (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.teal} />
            <Text style={styles.processingText}>Uploading your report…</Text>
          </View>
        ) : null}

        {notice && <Text style={styles.notice}>{notice}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.gradientButton, busy && styles.gradientButtonDisabled]}
          onPress={pickAndUpload}
          disabled={busy}
          activeOpacity={0.8}
        >
          <GradientOverlay stops={BUTTON_GRADIENT_STOPS} style={styles.gradientButtonFill} />
          <Text style={styles.gradientButtonText}>
            {busy ? "Uploading…" : files.length > 0 ? "Add another report" : "Choose report file"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={leave} disabled={busy} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={styles.skipText}>{files.length > 0 ? "Done" : "I'll add this later"}</Text>
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
  formatHint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.lg,
  },
  filesWrap: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.successTint,
  },
  filesHeading: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fileName: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  fileStatus: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.success,
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
  notice: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: spacing.lg,
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
  skipButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  skipText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
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
