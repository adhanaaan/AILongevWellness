import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { Search, Users, ClipboardCheck, CheckCircle2, AlertTriangle } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { SummaryStatCard } from "@/components/admin/SummaryStatCard";
import { ParticipantTableRow } from "@/components/admin/ParticipantTableRow";
import { TableRowSkeleton } from "@/components/admin/TableRowSkeleton";
import { repository } from "@/lib/data/mock";
import type { ParticipantSummary, PipelineState } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, spacing, radii, shadows } from "@/lib/theme/tokens";
import { useRouter } from "expo-router";

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<ParticipantSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    repository.listParticipants().then(setSummaries);
    return repository.subscribe(() => {
      repository.listParticipants().then(setSummaries);
    });
  }, []);

  const loaded = summaries !== null;
  const total = summaries?.length ?? 0;
  const awaiting = summaries?.filter((s) => s.pipeline.state === "gp_review").length ?? 0;
  const delivered = summaries?.filter(
    (s) => s.pipeline.state === "delivered"
  ).length ?? 0;
  const needsAttention = summaries?.filter(
    (s) => s.pipeline.needs_attention
  ).length ?? 0;

  const filtered = useMemo(() => {
    return (summaries ?? []).filter((s) => {
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
        <View style={styles.statItem}>
          <SummaryStatCard
            icon={<Users size={20} color={colors.inkMuted} />}
            label="Total"
            value={total}
            tone="neutral"
          />
        </View>
        <View style={styles.statItem}>
          <SummaryStatCard
            icon={<ClipboardCheck size={20} color={colors.sageDark} />}
            label="Awaiting GP/TCM"
            value={awaiting}
            tone="sage"
          />
        </View>
        <View style={styles.statItem}>
          <SummaryStatCard
            icon={<CheckCircle2 size={20} color={colors.sageDark} />}
            label="Delivered"
            value={delivered}
            tone="sage"
          />
        </View>
        <View style={styles.statItem}>
          <SummaryStatCard
            icon={<AlertTriangle size={20} color={colors.danger} />}
            label="Needs attention"
            value={needsAttention}
            tone="danger"
          />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Search
            size={18}
            color={colors.inkMuted}
            style={styles.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search participants by name…"
            placeholderTextColor={colors.inkMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={[styles.headerCell, { flex: 2 }]}>Participant</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Capture</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Status</Text>
          <View style={styles.headerSpacer} />
        </View>
        {!loaded &&
          Array.from({ length: 5 }, (_, i) => <TableRowSkeleton key={i} />)}
        {loaded &&
          filtered.map((summary) => (
            <ParticipantTableRow
              key={summary.participant.id}
              summary={summary}
              onPress={() =>
                router.push(`/admin/participants/${summary.participant.id}`)
              }
            />
          ))}
        {loaded && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Users size={22} color={colors.inkMuted} />
            </View>
            <Text style={styles.emptyText}>
              {query
                ? "No participants match your search."
                : "No participants yet."}
            </Text>
          </View>
        )}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing["2xl"],
  },
  statItem: {
    flexGrow: 1,
    flexBasis: 140,
  },
  searchRow: {
    marginBottom: spacing.xl,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
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
    backgroundColor: colors.surfaceMuted,
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
