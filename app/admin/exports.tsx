import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Download, FileSpreadsheet, FileJson } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, Button } from "@/components/ui";
import { repository } from "@/lib/data/mock";
import { toCsv } from "@/lib/export/csv";
import { downloadTextFile } from "@/lib/export/download";
import { colors, fontSizes, spacing } from "@/lib/theme/tokens";

type ExportKey = "participants" | "cards" | "audit";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function exportParticipantsCsv() {
  const summaries = await repository.listParticipants();
  const rows: Array<Array<string | number>> = [
    [
      "Name",
      "Age",
      "Sex",
      "Pipeline state",
      "Needs attention",
      "Capture completion %",
      "Biological age",
      "Chronological age",
      "Vascular score",
      "Metabolic score",
      "Mental score",
    ],
  ];
  for (const { participant, pipeline, captureCompletionPct } of summaries) {
    const draft = await repository.getAiDraft(participant.id);
    rows.push([
      participant.name,
      participant.age,
      participant.sex,
      pipeline.state,
      pipeline.needs_attention ? "Yes" : "No",
      captureCompletionPct,
      draft?.biological_age ?? "",
      draft?.chronological_age ?? "",
      draft?.scores.vascular ?? "",
      draft?.scores.metabolic ?? "",
      draft?.scores.mental ?? "",
    ]);
  }
  downloadTextFile(`participants-${todayIso()}.csv`, toCsv(rows), "text/csv");
}

async function exportSignedCardsJson() {
  const summaries = await repository.listParticipants();
  const delivered = summaries.filter((s) => s.pipeline.state === "delivered");
  const cards = [];
  for (const { participant } of delivered) {
    const card = await repository.getSignedCard(participant.id);
    if (card) cards.push(card);
  }
  downloadTextFile(`signed-cards-${todayIso()}.json`, JSON.stringify(cards, null, 2), "application/json");
}

async function exportAuditLogCsv() {
  const summaries = await repository.listParticipants();
  const rows: Array<Array<string | number>> = [["Participant", "Stage", "Reviewer", "Credential", "Signed at", "Notes"]];
  for (const { participant } of summaries) {
    const reviews = await repository.getReviews(participant.id);
    for (const r of reviews) {
      if (!r.signed_at) continue;
      rows.push([participant.name, r.stage, r.reviewer_name, r.reviewer_credential, r.signed_at, r.notes]);
    }
  }
  downloadTextFile(`audit-log-${todayIso()}.csv`, toCsv(rows), "text/csv");
}

const EXPORT_OPTIONS: Array<{
  key: ExportKey;
  icon: typeof FileSpreadsheet;
  title: string;
  description: string;
  run: () => Promise<void>;
}> = [
  {
    key: "participants",
    icon: FileSpreadsheet,
    title: "Participant data (CSV)",
    description: "Every participant's demographics, pipeline state, and pillar scores.",
    run: exportParticipantsCsv,
  },
  {
    key: "cards",
    icon: FileJson,
    title: "Signed cards (JSON)",
    description: "Full delivered health card data — narrative, scores, biomarkers, and sign-offs.",
    run: exportSignedCardsJson,
  },
  {
    key: "audit",
    icon: Download,
    title: "Audit log (CSV)",
    description: "Every completed sign-off across all participants — reviewer, credential, and timestamp.",
    run: exportAuditLogCsv,
  },
];

export default function ExportsPage() {
  const [running, setRunning] = useState<ExportKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(option: (typeof EXPORT_OPTIONS)[number]) {
    setRunning(option.key);
    setError(null);
    try {
      await option.run();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed. Please try again.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <AdminShell title="Exports">
      <Text style={styles.heading}>Data exports</Text>
      <Text style={styles.subtitle}>
        Download participant data for reporting or compliance purposes.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.list}>
        {EXPORT_OPTIONS.map((option) => (
          <Card key={option.key} style={styles.card}>
            <View style={styles.cardRow}>
              <option.icon size={24} color={colors.sageDark} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDesc}>{option.description}</Text>
              </View>
              <Button
                variant="secondary"
                size="sm"
                disabled={running !== null}
                onPress={() => handleExport(option)}
              >
                {running === option.key ? "Exporting…" : "Export"}
              </Button>
            </View>
          </Card>
        ))}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginBottom: spacing["2xl"],
  },
  error: {
    fontSize: fontSizes.bodyMd,
    color: colors.danger,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSizes.bodyMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  cardDesc: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
});
