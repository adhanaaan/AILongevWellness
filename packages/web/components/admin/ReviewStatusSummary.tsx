import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CheckCircle2, Clock, Send } from "lucide-react-native";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";
import type { Pipeline, Review } from "@/lib/types/db";

interface ReviewStatusSummaryProps {
  pipeline: Pipeline;
  gpReview: Review | undefined;
  tcmReview: Review | undefined;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// A calm, read-only banner that makes the review console's *primary job* legible
// the moment the page opens: what still needs a signature, and whether the card
// is ready to release. It mirrors the exact same review/pipeline data the real
// SignOffStage cards and ReleaseButton act on below — it never itself signs off
// or releases anything.
export function ReviewStatusSummary({ pipeline, gpReview, tcmReview }: ReviewStatusSummaryProps) {
  const gpSigned = !!gpReview?.signed_at;
  const tcmSigned = !!tcmReview?.signed_at;
  const state = pipeline.state;
  const delivered = state === "delivered";
  const readyToRelease = state === "signed";

  let headline: string;
  let tone: "pending" | "ready" | "done";
  if (delivered) {
    headline = pipeline.delivered_at
      ? `Delivered to participant ${formatDate(pipeline.delivered_at)}`
      : "Delivered to participant";
    tone = "done";
  } else if (readyToRelease) {
    headline = "Both sign-offs complete — ready to release";
    tone = "ready";
  } else if (gpSigned && !tcmSigned) {
    headline = "Awaiting TCM sign-off";
    tone = "pending";
  } else if (!gpSigned && tcmSigned) {
    headline = "Awaiting GP sign-off";
    tone = "pending";
  } else {
    headline = "Awaiting GP and TCM sign-off";
    tone = "pending";
  }

  const accent =
    tone === "pending" ? colors.warning : tone === "ready" ? colors.sage : colors.sageDark;

  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.headlineRow}>
          {delivered ? (
            <CheckCircle2 size={18} color={colors.sageDark} />
          ) : readyToRelease ? (
            <Send size={16} color={colors.sage} />
          ) : (
            <Clock size={16} color={colors.warning} />
          )}
          <Text style={styles.headline}>{headline}</Text>
        </View>

        <View style={styles.stages}>
          <StageRow label="GP sign-off" review={gpReview} />
          <StageRow label="TCM sign-off" review={tcmReview} />
        </View>
      </View>
    </View>
  );
}

function StageRow({ label, review }: { label: string; review: Review | undefined }) {
  const signed = !!review?.signed_at;
  return (
    <View style={styles.stageRow}>
      {signed ? (
        <CheckCircle2 size={16} color={colors.sageDark} />
      ) : (
        <Clock size={16} color={colors.inkMuted} />
      )}
      <Text style={styles.stageLabel}>{label}</Text>
      <Text style={[styles.stageStatus, signed ? styles.stageStatusSigned : styles.stageStatusPending]}>
        {signed ? `Signed · ${review!.reviewer_name}` : "Pending"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  headlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headline: {
    flex: 1,
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    color: colors.charcoal,
  },
  stages: {
    gap: spacing.sm,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stageLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.charcoal,
    width: 110,
  },
  stageStatus: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
  },
  stageStatusSigned: {
    color: colors.sageDark,
  },
  stageStatusPending: {
    color: colors.inkMuted,
  },
});
