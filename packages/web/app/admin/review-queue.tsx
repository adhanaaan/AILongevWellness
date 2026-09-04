import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
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
      <View style={styles.lead}>
        <Text style={styles.overline}>Awaiting sign-off</Text>
        {loaded ? (
          <Text style={styles.leadTitle}>
            <Text style={styles.leadCount}>{queued.length}</Text>
            {` participant${queued.length !== 1 ? "s" : ""} awaiting review`}
          </Text>
        ) : (
          <Text style={styles.leadTitle}>Loading review queue…</Text>
        )}
        <Text style={styles.subheading}>
          GP and TCM reviewers sign off independently, in either order.
        </Text>
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
  lead: {
    marginBottom: spacing["2xl"],
  },
  overline: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  leadTitle: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineMd,
    color: colors.charcoal,
  },
  leadCount: {
    fontFamily: fontFamilies.displayBold,
    color: colors.tealDark,
  },
  subheading: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  segmentRow: {
    marginBottom: spacing["2xl"],
  },
  listContainer: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadows.soft,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
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
