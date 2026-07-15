import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { Search, Users, ClipboardCheck, CheckCircle2, AlertTriangle } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { SummaryStatCard } from "@/components/admin/SummaryStatCard";
import { ParticipantTableRow } from "@/components/admin/ParticipantTableRow";
import { repository } from "@/lib/data/mock";
import type { ParticipantSummary, PipelineState } from "@/lib/types/db";
import { colors, fontSizes, radii } from "@/lib/theme/tokens";
import { useRouter } from "expo-router";

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<ParticipantSummary[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    repository.listParticipants().then(setSummaries);
    return repository.subscribe(() => {
      repository.listParticipants().then(setSummaries);
    });
  }, []);

  const total = summaries.length;
  const awaiting = summaries.filter(
    (s) =>
      s.pipeline.state === "gp_review" || s.pipeline.state === "tcm_review"
  ).length;
  const delivered = summaries.filter(
    (s) => s.pipeline.state === "delivered"
  ).length;
  const needsAttention = summaries.filter(
    (s) => s.pipeline.needs_attention
  ).length;

  const filtered = useMemo(() => {
    return summaries.filter((s) => {
      const matchesQuery = s.participant.name
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "needs_attention"
          ? s.pipeline.needs_attention
          : s.pipeline.state === (filter as PipelineState));
      return matchesQuery && matchesFilter;
    });
  }, [summaries, query, filter]);

  return (
    <AdminShell title="Participants">
      <View style={styles.stats}>
        <SummaryStatCard
          icon={<Users size={20} color={colors.inkMuted} />}
          label="Total"
          value={total}
          tone="neutral"
        />
        <SummaryStatCard
          icon={<ClipboardCheck size={20} color={colors.sageDark} />}
          label="Awaiting GP/TCM"
          value={awaiting}
          tone="sage"
        />
        <SummaryStatCard
          icon={<CheckCircle2 size={20} color={colors.sageDark} />}
          label="Delivered"
          value={delivered}
          tone="sage"
        />
        <SummaryStatCard
          icon={<AlertTriangle size={20} color={colors.danger} />}
          label="Needs attention"
          value={needsAttention}
          tone="danger"
        />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Search
            size={16}
            color={colors.inkMuted}
            style={styles.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search participants..."
            placeholderTextColor={colors.inkMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={[styles.headerCell, { flex: 2 }]}>Participant</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Status</Text>
        </View>
        {filtered.map((summary) => (
          <ParticipantTableRow
            key={summary.participant.id}
            summary={summary}
            onPress={() =>
              router.push(`/admin/participants/${summary.participant.id}`)
            }
          />
        ))}
        {filtered.length === 0 && (
          <Text style={styles.emptyText}>
            No participants match your search.
          </Text>
        )}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  searchRow: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
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
