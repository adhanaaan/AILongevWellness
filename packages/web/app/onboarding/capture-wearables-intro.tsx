import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { HeartPulse, Moon, Activity, UploadCloud, Smartphone, User, ChevronRight, Share2 } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card } from "@/components/ui/Card";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { UploadedFilesList } from "@/components/onboarding/UploadedFilesList";
import { WearableConnectOptions } from "@/components/onboarding/WearableConnectOptions";
import { extractWearableExport } from "@/lib/ai/client";
import { useChannelUpload } from "@/lib/onboarding/useChannelUpload";
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
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { phase, busy, error, notice, files, pickAndUpload, skip } = useChannelUpload({
    kind: "apple_health_export",
    channel: "wearables",
    section: "wearables",
    // Apple Health's "Export All Health Data" produces a .zip containing
    // export.xml; some devices/paths hand over the raw export.xml directly, so
    // accept both (extract-wearables handles either).
    pickerTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/xml",
      "text/xml",
    ],
    extract: extractWearableExport,
    noun: "health export",
    isEditing: mode === "edit",
  });

  return (
    <CaptureFlowStepper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <Smartphone size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Phone health data</Text>
        <Text style={styles.subtitle}>
          Your phone already tracks a lot — steps, heart rate, sleep and activity — even if you
          don&apos;t wear a watch. Sharing it gives us a fuller picture of your day-to-day patterns
          alongside your labs and questionnaire answers. Got a wearable? Even better, it flows in too.
        </Text>

        <Card padding="lg" style={styles.pointsCard}>
          <Text style={styles.pointsHeading}>What this feeds into</Text>
          <Text style={styles.pointsBody}>
            Your Health app data includes metrics like heart rate, sleep, activity and HRV.
            These roll up into your Vascular, Metabolic and Mental pillar scores.
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

        <WearableConnectOptions />

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

        <Text style={styles.formatHint}>Accepted: the .zip from Apple Health (or its export.xml).</Text>

        <UploadedFilesList files={files} />

        {busy ? (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.teal} />
            <Text style={styles.processingText}>
              {phase === "uploading" ? "Uploading your export…" : "Reading your health data…"}
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
                  ? "Add another export"
                  : "Choose export file"}
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
  notice: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: spacing.lg,
  },
  formatHint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
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
