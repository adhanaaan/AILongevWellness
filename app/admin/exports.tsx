import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Download, FileSpreadsheet, FileText } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, Button } from "@/components/ui";
import { colors, fontSizes, spacing } from "@/lib/theme/tokens";

const EXPORT_OPTIONS = [
  {
    icon: FileSpreadsheet,
    title: "Participant data (CSV)",
    description: "Export all participant demographics, biomarkers, and scores.",
  },
  {
    icon: FileText,
    title: "Signed cards (PDF)",
    description: "Download all delivered health cards as a bundled PDF.",
  },
  {
    icon: Download,
    title: "Audit log",
    description: "Export sign-off history and pipeline state changes.",
  },
];

export default function ExportsPage() {
  return (
    <AdminShell title="Exports">
      <Text style={styles.heading}>Data exports</Text>
      <Text style={styles.subtitle}>
        Download participant data for reporting or compliance purposes.
      </Text>

      <View style={styles.list}>
        {EXPORT_OPTIONS.map((option) => (
          <Card key={option.title} style={styles.card}>
            <View style={styles.cardRow}>
              <option.icon size={24} color={colors.sageDark} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDesc}>{option.description}</Text>
              </View>
              <Button variant="secondary" size="sm" onPress={() => {}}>
                Export
              </Button>
            </View>
          </Card>
        ))}
      </View>

      <Text style={styles.hint}>
        Exports use mock data in this demo. In production, these would generate
        real downloadable files.
      </Text>
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
  hint: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing["2xl"],
  },
});
