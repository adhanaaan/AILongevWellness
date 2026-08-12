import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { ClipboardCheck } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { ParticipantTableRow } from "@/components/admin/ParticipantTableRow";
import { TableRowSkeleton } from "@/components/admin/TableRowSkeleton";
import { SegmentedControl } from "@/components/ui";
import { repository } from "@/lib/data/mock";
import type { ParticipantSummary } from "@/lib/types/db";
import { colors, fontSizes, spacing, radii } from "@/lib/theme/tokens";
import { useRouter } from "expo-router";

// GP and TCM sign off independently, in either order -- these segments filter
// by which specific stage is still outstanding rather than by pipeline.state,
// since both stages share the same "gp_review" (awaiting one or both) state.
const SEGMENTS = [
  { value: "all", label: "All Reviews" },
  { value: "needs_gp", label: "Needs GP" },
  { value: "needs_tcm", label: "Needs TCM" },
];

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
  const queued = useMemo(() => {
    const reviewable = (summaries ?? []).filter((s) => s.pipeline.state === "gp_review");
    if (segment === "needs_gp") return reviewable.filter((s) => !s.gpSigned);
    if (segment === "needs_tcm") return reviewable.filter((s) => !s.tcmSigned);
    return reviewable;
  }, [summaries, segment]);

  return (
    <AdminShell title="Review Queue">
      <View style={styles.headerRow}>
        <ClipboardCheck size={24} color={colors.sageDark} />
        <Text style={styles.heading}>
          {loaded
            ? `${queued.length} participant${queued.length !== 1 ? "s" : ""} awaiting review`
            : "Loading review queue..."}
        </Text>
      </View>

      <View style={styles.segmentRow}>
        <SegmentedControl
          options={SEGMENTS}
          value={segment}
          onChange={setSegment}
        />
      </View>

      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={[styles.headerCell, { flex: 2 }]}>Participant</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Status</Text>
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
          <Text style={styles.emptyText}>No participants in the review queue.</Text>
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
    marginBottom: spacing["2xl"],
  },
  heading: {
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  segmentRow: {
    marginBottom: spacing["2xl"],
  },
  listContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  listHeader: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCell: {
    fontSize: fontSizes.caption,
    fontWeight: "600",
    color: colors.inkMuted,
  },
  emptyText: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    textAlign: "center",
    padding: 24,
  },
});
