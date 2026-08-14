import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { FileText, Droplet, Activity, HeartPulse, UploadCloud, Camera } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card } from "@/components/ui/Card";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { UploadedFilesList } from "@/components/onboarding/UploadedFilesList";
import { extractLabReport } from "@/lib/ai/client";
import { useChannelUpload } from "@/lib/onboarding/useChannelUpload";
import { colors, fontFamilies, fontSizes, radii, spacing, teal } from "@/lib/theme/tokens";

const POINTS = [
  { Icon: HeartPulse, label: "Lipids & cholesterol" },
  { Icon: Activity, label: "hs-CRP & HbA1c" },
  { Icon: Droplet, label: "Glucose & insulin" },
];

const FORMATS = [
  { Icon: FileText, text: "A PDF of your lab results, screening, or panel." },
  { Icon: Camera, text: "A clear photo of a printed report." },
  { Icon: Activity, text: "A CGM (continuous glucose monitor) summary report." },
];

const BUTTON_GRADIENT_STOPS = [
  { offset: "0", color: teal[200] },
  { offset: "1", color: teal[400] },
];

export default function CaptureLabReportsIntroPage() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { phase, busy, error, notice, files, pickAndUpload, skip } = useChannelUpload({
    kind: "lab_report",
    channel: "lab_report",
    section: "lab_reports",
    pickerTypes: ["application/pdf", "image/*"],
    extract: extractLabReport,
    noun: "lab report",
    isEditing: mode === "edit",
  });

  return (
    <CaptureFlowStepper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <FileText size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Lab Reports</Text>
        <Text style={styles.subtitle}>
          Now let&apos;s add your latest lab work. Upload a recent report and our AI reads
          the values straight off the page for you.
        </Text>

        <Card padding="lg" style={styles.pointsCard}>
          <Text style={styles.pointsHeading}>What this feeds into</Text>
          <Text style={styles.pointsBody}>
            We pull out key markers like cholesterol, blood sugar, and inflammation
            levels, along with their reference ranges. These roll up into your
            Vascular and Metabolic pillar scores.
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
        <Text style={styles.title}>Upload Your Report</Text>
        <Text style={styles.subtitle}>
          Choose a PDF or photo from your device — that&apos;s all we need.
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

        <UploadedFilesList files={files} />

        {busy ? (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.teal} />
            <Text style={styles.processingText}>
              {phase === "uploading" ? "Uploading your report…" : "Reading the values off your report…"}
            </Text>
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
            {phase === "uploading"
              ? "Uploading…"
              : phase === "extracting"
                ? "Reading…"
                : files.length > 0
                  ? "Add another report"
                  : "Choose file"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={skip} disabled={busy} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={styles.skipText}>I&apos;ll add this later</Text>
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
  notice: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
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
