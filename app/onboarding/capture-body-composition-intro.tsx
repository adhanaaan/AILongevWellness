import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { PersonStanding, Scale, Flame, Droplets } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card } from "@/components/ui/Card";
import { updateSectionStatusAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const POINTS = [
  { Icon: Scale, label: "BMI, fat mass & lean mass" },
  { Icon: Flame, label: "Metabolic age & BMR" },
  { Icon: Droplets, label: "Hydration & visceral fat" },
];

export default function CaptureBodyCompositionIntroPage() {
  const router = useRouter();
  const { participantId } = useAuth();

  async function onContinue() {
    if (participantId) {
      await updateSectionStatusAction("body_composition", "in_progress", participantId);
    }
    router.push("/onboarding/capture-body-composition-upload");
  }

  return (
    <CaptureFlowStepper activeSection="body_composition">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <PersonStanding size={24} color={colors.teal} />
        </GlassCard>
        <Text style={styles.title}>Body Composition</Text>
        <Text style={styles.subtitle}>
          Next we&apos;ll capture your body composition scan. This adds a detailed physical
          snapshot alongside your labs and questionnaire answers, giving a fuller view of how
          your body is doing today.
        </Text>

        <Card padding="lg" style={styles.pointsCard}>
          <Text style={styles.pointsHeading}>What this feeds into</Text>
          <Text style={styles.pointsBody}>
            A single scan reads out roughly 18 metrics — things like BMI, fat mass, lean mass,
            muscle mass, visceral fat, metabolic age, basal metabolic rate (BMR), and hydration —
            which roll up into your Vascular and Metabolic pillar scores.
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
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" onPress={onContinue}>
          Continue
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
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
