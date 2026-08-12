import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { ClipboardCheck } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { ParticipantTableRow } from "@/components/admin/ParticipantTableRow";
import { TableRowSkeleton } from "@/components/admin/TableRowSkeleton";
import { SegmentedControl } from "@/components/ui";
import { repository } from "@/lib/data/mock";
import type { ParticipantSummary } from "@/lib/types/db";
import { CheckCircle2 } from "lucide-react-native";
import { colors, fontFamilies, fontSizes, spacing, radii, shadows } from "@/lib/theme/tokens";
import { useRouter } from "expo-router";

export default function ReviewQueuePage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<ParticipantSummary[] | null>(null);
  const [segment, setSegment] = useState("all");

  useEffect(() => {
    repository.listParticipants().then(setSummaries);
    return repository.subscribe(() => {
      repository.listParticipants().then(setSummaries);
    });
  }, []);

  const loaded = summaries !== null;
  const reviewable = useMemo(
    () => (summaries ?? []).filter((s) => s.pipeline.state === "gp_review"),
    [summaries]
  );
  const needsGpCount = reviewable.filter((s) => !s.gpSigned).length;
  const needsTcmCount = reviewable.filter((s) => !s.tcmSigned).length;

  // GP and TCM sign off independently, in either order -- these segments filter
  // by which specific stage is still outstanding rather than by pipeline.state,
  // since both stages share the same "gp_review" (awaiting one or both) state.
  const segments = [
    { value: "all", label: `All (${reviewable.length})` },
    { value: "needs_gp", label: `Needs GP (${needsGpCount})` },
    { value: "needs_tcm", label: `Needs TCM (${needsTcmCount})` },
  ];

  const queued = useMemo(() => {
    if (segment === "needs_gp") return reviewable.filter((s) => !s.gpSigned);
    if (segment === "needs_tcm") return reviewable.filter((s) => !s.tcmSigned);
    return reviewable;
  }, [reviewable, segment]);

  return (
    <AdminShell title="Review Queue">
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <ClipboardCheck size={22} color={colors.sageDark} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.heading}>
            {loaded
              ? `${queued.length} participant${queued.length !== 1 ? "s" : ""} awaiting review`
              : "Loading review queue…"}
          </Text>
          <Text style={styles.subheading}>
            GP and TCM reviewers sign off independently, in either order.
          </Text>
        </View>
      </View>

      <View style={styles.segmentRow}>
        <SegmentedControl
          options={segments}
          value={segment}
          onChange={setSegment}
        />
      </View>

      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={[styles.headerCell, { flex: 2 }]}>Participant</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Capture</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Status</Text>
          <View style={styles.headerSpacer} />
        </View>
        {!loaded &&
          Array.from({ length: 3 }, (_, i) => <TableRowSkeleton key={i} />)}
        {loaded &&
          queued.map((summary) => (
            <ParticipantTableRow
              key={summary.participant.id}
              summary={summary}
              onPress={() =>
                router.push(`/admin/participants/${summary.participant.id}`)
              }
            />
          ))}
        {loaded && queued.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <CheckCircle2 size={22} color={colors.sageDark} />
            </View>
            <Text style={styles.emptyText}>
              {segment === "all"
                ? "The review queue is clear — nothing awaiting sign-off."
                : "Nothing in this segment right now."}
            </Text>
          </View>
        )}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  heading: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.charcoal,
  },
  subheading: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  segmentRow: {
    marginBottom: spacing.xl,
  },
  listContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadows.card,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headerSpacer: {
    width: 24,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing["4xl"],
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    textAlign: "center",
  },
});
