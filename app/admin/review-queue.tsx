import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { ClipboardCheck } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { ParticipantTableRow } from "@/components/admin/ParticipantTableRow";
import { SegmentedControl } from "@/components/ui";
import { repository } from "@/lib/data/mock";
import type { ParticipantSummary } from "@/lib/types/db";
import { colors, fontSizes, spacing, radii } from "@/lib/theme/tokens";
import { useRouter } from "expo-router";

const SEGMENTS = [
  { value: "all", label: "All Reviews" },
  { value: "gp_review", label: "GP Review" },
  { value: "tcm_review", label: "TCM Review" },
];

export default function ReviewQueuePage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<ParticipantSummary[]>([]);
  const [segment, setSegment] = useState("all");

  useEffect(() => {
    repository.listParticipants().then(setSummaries);
    return repository.subscribe(() => {
      repository.listParticipants().then(setSummaries);
    });
  }, []);

  const queued = useMemo(() => {
    const reviewable = summaries.filter(
      (s) =>
        s.pipeline.state === "gp_review" || s.pipeline.state === "tcm_review"
    );
    if (segment === "gp_review") return reviewable.filter((s) => s.pipeline.state === "gp_review");
    if (segment === "tcm_review") return reviewable.filter((s) => s.pipeline.state === "tcm_review");
    return reviewable;
  }, [summaries, segment]);

  return (
    <AdminShell title="Review Queue">
      <View style={styles.headerRow}>
        <ClipboardCheck size={24} color={colors.sageDark} />
        <Text style={styles.heading}>
          {queued.length} participant{queued.length !== 1 ? "s" : ""} awaiting
          review
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
        {queued.map((summary) => (
          <ParticipantTableRow
            key={summary.participant.id}
            summary={summary}
            onPress={() =>
              router.push(`/admin/participants/${summary.participant.id}`)
            }
          />
        ))}
        {queued.length === 0 && (
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
