import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck, ShieldAlert } from "lucide-react-native";
import { PipelineStatusBadge } from "@/components/admin/PipelineStatusBadge";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";
import type { Participant, Pipeline, AiDraft, Pillar } from "@/lib/types/db";

interface ReviewParticipantHeaderProps {
  participant: Participant;
  pipeline: Pipeline;
  aiDraft: AiDraft | null;
  gpSigned: boolean;
  tcmSigned: boolean;
}

const PILLAR_META: { key: Pillar; label: string; color: string }[] = [
  { key: "vascular", label: "Vascular", color: colors.vascular },
  { key: "metabolic", label: "Metabolic", color: colors.metabolic },
  { key: "mental", label: "Mental", color: colors.mental },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// The calm, at-a-glance identity + snapshot card that opens the review console:
// who the participant is, their consent standing, where they sit in the pipeline,
// and — the moment a draft exists — their biological age and three pillar scores,
// so the reviewer takes in the whole picture before scrolling into detail.
// Read-only display; every number is read straight off aiDraft.
export function ReviewParticipantHeader({
  participant,
  pipeline,
  aiDraft,
  gpSigned,
  tcmSigned,
}: ReviewParticipantHeaderProps) {
  const delta = aiDraft ? aiDraft.chronological_age - aiDraft.biological_age : 0;
  const deltaLabel =
    delta > 0 ? `${delta}y younger` : delta < 0 ? `${Math.abs(delta)}y older` : "On pace";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <Text style={styles.name}>{participant.name}</Text>
          <Text style={styles.meta}>
            {participant.age} · {participant.sex} · {participant.height_cm}cm · {participant.weight_kg}kg
          </Text>
          <View style={styles.consentRow}>
            {participant.consent_withdrawn_at ? (
              <>
                <ShieldAlert size={13} color={colors.danger} />
                <Text style={styles.consentMissing}>
                  Consent withdrawn {formatDate(participant.consent_withdrawn_at)}
                </Text>
              </>
            ) : participant.consent_given ? (
              <>
                <ShieldCheck size={13} color={colors.sage} />
                <Text style={styles.consentOk}>
                  Consent given{participant.consented_at ? ` ${formatDate(participant.consented_at)}` : ""}
                </Text>
              </>
            ) : (
              <>
                <ShieldAlert size={13} color={colors.danger} />
                <Text style={styles.consentMissing}>Consent not recorded</Text>
              </>
            )}
          </View>
        </View>
        <PipelineStatusBadge
          state={pipeline.state}
          needsAttention={pipeline.needs_attention}
          gpSigned={gpSigned}
          tcmSigned={tcmSigned}
        />
      </View>

      {aiDraft && (
        <View style={styles.snapshot}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Bio age</Text>
            <Text style={styles.statValue}>{aiDraft.biological_age}</Text>
            <Text style={styles.statSub}>{deltaLabel}</Text>
          </View>
          <View style={styles.divider} />
          {PILLAR_META.map(({ key, label, color }, i) => (
            <React.Fragment key={key}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.statCell}>
                <View style={styles.pillarLabelRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
                <Text style={styles.statValue}>
                  {aiDraft.scores[key]}
                  <Text style={styles.statUnit}> /100</Text>
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing["2xl"],
    ...shadows.soft,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  identity: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.charcoal,
  },
  meta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  consentOk: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.sageDark,
  },
  consentMissing: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.danger,
  },
  snapshot: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statCell: {
    flex: 1,
    gap: 4,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  pillarLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
  },
  statLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.inkMuted,
  },
  statValue: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.charcoal,
  },
  statUnit: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  statSub: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.sageDark,
  },
});
