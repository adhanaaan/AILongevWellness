import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { Search, Users, ClipboardCheck, CheckCircle2, AlertTriangle } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { SummaryStatCard } from "@/components/admin/SummaryStatCard";
import { ParticipantTableRow } from "@/components/admin/ParticipantTableRow";
import { repository } from "@/lib/data/mock";
import type { ParticipantSummary } from "@/lib/types/db";
import { colors, fontSizes, radii } from "@/lib/theme/tokens";
import { useRouter } from "expo-router";

type DashboardFilter = "all" | "awaiting_review" | "delivered" | "needs_attention";

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<ParticipantSummary[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DashboardFilter>("all");

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

  const toggleFilter = (next: DashboardFilter) =>
    setFilter((current) => (current === next ? "all" : next));

  const filtered = useMemo(() => {
    return summaries
      .filter((s) => {
        const matchesQuery = s.participant.name
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesFilter =
          filter === "all"
            ? true
            : filter === "needs_attention"
            ? s.pipeline.needs_attention
            : filter === "awaiting_review"
            ? s.pipeline.state === "gp_review" || s.pipeline.state === "tcm_review"
            : s.pipeline.state === "delivered";
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => {
        if (a.pipeline.needs_attention !== b.pipeline.needs_attention) {
          return a.pipeline.needs_attention ? -1 : 1;
        }
        return a.participant.name.localeCompare(b.participant.name);
      });
  }, [summaries, query, filter]);

  const emptyMessage =
    query.length > 0
      ? `No participants match "${query}".`
      : filter === "needs_attention"
      ? "Nothing needs attention right now."
      : filter === "awaiting_review"
      ? "No one is currently awaiting GP or TCM review."
      : filter === "delivered"
      ? "No health cards have been delivered yet."
      : "No participants yet.";

  return (
    <AdminShell title="Participants">
      <View style={styles.stats}>
        <SummaryStatCard
          icon={<Users size={20} color={colors.inkMuted} />}
          label="Total"
          value={total}
          tone="neutral"
          active={filter === "all"}
          onPress={() => setFilter("all")}
        />
        <SummaryStatCard
          icon={<ClipboardCheck size={20} color={colors.metabolicDark} />}
          label="Awaiting GP/TCM"
          value={awaiting}
          tone="terracotta"
          active={filter === "awaiting_review"}
          onPress={() => toggleFilter("awaiting_review")}
        />
        <SummaryStatCard
          icon={<CheckCircle2 size={20} color={colors.sageDark} />}
          label="Delivered"
          value={delivered}
          tone="sage"
          active={filter === "delivered"}
          onPress={() => toggleFilter("delivered")}
        />
        <SummaryStatCard
          icon={<AlertTriangle size={20} color={colors.danger} />}
          label="Needs attention"
          value={needsAttention}
          tone="danger"
          active={filter === "needs_attention"}
          onPress={() => toggleFilter("needs_attention")}
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
          <Text style={styles.emptyText}>{emptyMessage}</Text>
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
