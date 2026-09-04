import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Download, FileSpreadsheet, FileJson } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, Button } from "@/components/ui";
import { InsightsSectionHeader } from "@/components/participant/InsightsSectionHeader";
import { repository } from "@/lib/data/mock";
import { toCsv } from "@/lib/export/csv";
import { downloadTextFile } from "@/lib/export/download";
import { colors, fontFamilies, fontSizes, spacing, radii } from "@/lib/theme/tokens";

type ExportKey = "participants" | "cards" | "audit";
type ExportFormat = "CSV" | "JSON";

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
  format: ExportFormat;
  description: string;
  run: () => Promise<void>;
}> = [
  {
    key: "participants",
    icon: FileSpreadsheet,
    title: "Participant data",
    format: "CSV",
    description: "Every participant's demographics, pipeline state, and pillar scores.",
    run: exportParticipantsCsv,
  },
  {
    key: "cards",
    icon: FileJson,
    title: "Signed cards",
    format: "JSON",
    description: "Full delivered health card data — narrative, scores, biomarkers, and sign-offs.",
    run: exportSignedCardsJson,
  },
  {
    key: "audit",
    icon: Download,
    title: "Audit log",
    format: "CSV",
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
      <Text style={styles.lede}>
        Download live participant data for reporting or compliance. Files generate
        in your browser from the current records.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.section}>
        <InsightsSectionHeader label="Available exports" />
        <View style={styles.list}>
          {EXPORT_OPTIONS.map((option) => (
            <Card key={option.key} padding="lg" style={styles.card}>
              <View style={styles.cardHead}>
                <option.icon size={20} color={colors.inkMuted} strokeWidth={1.75} />
                <Text style={styles.cardTitle}>{option.title}</Text>
                <View style={styles.formatChip}>
                  <Text style={styles.formatChipText}>{option.format}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{option.description}</Text>
              <Button
                variant="secondary"
                size="md"
                disabled={running !== null}
                onPress={() => handleExport(option)}
                iconLeft={
                  running === option.key ? undefined : (
                    <Download size={16} color={colors.teal} strokeWidth={2} />
                  )
                }
                style={styles.cardButton}
              >
                {running === option.key ? "Preparing…" : `Download ${option.format}`}
              </Button>
            </Card>
          ))}
        </View>
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  lede: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    lineHeight: 24,
    marginBottom: spacing["2xl"],
    maxWidth: 520,
  },
  error: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.bodyMd,
    color: colors.danger,
    marginBottom: spacing.lg,
  },
  section: {
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyLg,
    color: colors.charcoal,
  },
  formatChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  formatChipText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.6,
    color: colors.inkMuted,
  },
  cardDesc: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 21,
  },
  cardButton: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
});
