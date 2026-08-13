import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Sparkles, AlertTriangle } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";
import type { GenerateDraftStatus } from "@/lib/ai/useGenerateDraft";

export interface GeneratePlanCardProps {
  status: GenerateDraftStatus;
  error: string | null;
  onGenerate: () => void;
}

// Shown on the Care Plan tab when a participant has no personalized AI draft yet.
// Rather than silently dressing up generic starter bullets as "your plan," it
// offers a real, visible action to generate the plan from their screening data,
// with an explicit generating state and a surfaced error + retry when it fails —
// so a broken backend is diagnosable instead of invisible.
export function GeneratePlanCard({ status, error, onGenerate }: GeneratePlanCardProps) {
  if (status === "generating") {
    return (
      <View style={styles.card}>
        <GradientOrb tone="teal" size={180} style={styles.orb} />
        <ActivityIndicator color={colors.sage} />
        <Text style={styles.title}>Building your personalized plan…</Text>
        <Text style={styles.sub}>
          Turning your labs, wearables, and goals into recommendations tailored to you.
        </Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.cardError]}>
        <View style={styles.iconWarn}>
          <AlertTriangle size={20} color={colors.terracottaInk} />
        </View>
        <Text style={styles.title}>We couldn&apos;t generate your plan</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button variant="secondary" onPress={onGenerate} style={styles.btn}>
          Try again
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <GradientOrb tone="teal" size={180} style={styles.orb} />
      <View style={styles.iconSparkle}>
        <Sparkles size={20} color={colors.sageDark} />
      </View>
      <Text style={styles.title}>Generate your personalized plan</Text>
      <Text style={styles.sub}>
        You&apos;ve shared your screening data — turn it into a plan tailored to you, ready for your care
        team to review.
      </Text>
      <Button onPress={onGenerate} style={styles.btn}>
        Generate my plan
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.sageTint,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing["2xl"],
    alignItems: "center",
    overflow: "hidden",
    ...shadows.soft,
  },
  cardError: {
    backgroundColor: colors.terracottaTint,
  },
  orb: { top: -60, right: -40 },
  iconSparkle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  iconWarn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    fontWeight: "700",
    color: colors.charcoal,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  sub: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 20,
    maxWidth: 320,
  },
  errorText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.terracottaInk,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 17,
    maxWidth: 320,
  },
  btn: {
    marginTop: spacing.lg,
    minWidth: 200,
  },
});
