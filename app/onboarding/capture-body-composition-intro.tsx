import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { PersonStanding, Scale, Flame, Droplets, UploadCloud, FileImage } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card } from "@/components/ui/Card";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { UploadedFilesList } from "@/components/onboarding/UploadedFilesList";
import { extractBodyComp } from "@/lib/ai/client";
import { useChannelUpload } from "@/lib/onboarding/useChannelUpload";
import { colors, fontFamilies, fontSizes, radii, spacing, teal } from "@/lib/theme/tokens";

const POINTS = [
  { Icon: Scale, label: "BMI, fat mass & lean mass" },
  { Icon: Flame, label: "Metabolic age & BMR" },
  { Icon: Droplets, label: "Hydration & visceral fat" },
];

const BUTTON_GRADIENT_STOPS = [
  { offset: "0", color: teal[200] },
  { offset: "1", color: teal[400] },
];

export default function CaptureBodyCompositionIntroPage() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { phase, busy, error, notice, files, pickAndUpload, skip } = useChannelUpload({
    kind: "body_comp",
    channel: "body_composition",
    section: "body_composition",
    pickerTypes: ["application/pdf", "image/*"],
    extract: extractBodyComp,
    noun: "body composition scan",
    isEditing: mode === "edit",
  });

  return (
    <CaptureFlowStepper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <PersonStanding size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Body Composition</Text>
        <Text style={styles.subtitle}>
          Next, we&apos;ll capture your body composition scan. It adds a physical snapshot
          alongside your labs and questionnaire answers for a fuller picture of your health.
        </Text>

        <Card padding="lg" style={styles.pointsCard}>
          <Text style={styles.pointsHeading}>What this feeds into</Text>
          <Text style={styles.pointsBody}>
            A single scan captures around 18 measurements, including BMI, fat and
            muscle mass, metabolic age, and hydration. These roll up into your
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
        <Text style={styles.title}>Upload Your Scan</Text>
        <Text style={styles.subtitle}>
          Upload a photo or PDF of your scan printout. If you completed this at the retreat
          kiosk, that printed report works too.
        </Text>

        <Card padding="lg" style={styles.tipCard}>
          <View style={styles.tipRow}>
            <View style={styles.tipIcon}>
              <FileImage size={18} color={colors.tealDark} />
            </View>
            <Text style={styles.tipText}>
              A clear photo or scanned PDF of the printout is all we need.
            </Text>
          </View>
        </Card>

        <UploadedFilesList files={files} />

        {busy ? (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.teal} />
            <Text style={styles.processingText}>
              {phase === "uploading" ? "Uploading your scan…" : "Reading the values off your scan…"}
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
                  ? "Add another scan"
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
  tipCard: {
    marginTop: spacing["2xl"],
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
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
