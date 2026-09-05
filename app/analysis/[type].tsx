import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FadeInView } from "@/components/ui/FadeInView";
import { WellnessDisclaimer } from "@/components/participant/WellnessDisclaimer";
import { ANALYSIS_REPORTS, type AnalysisStatStatus } from "@/lib/analysis/content";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

const STATUS_META: Record<AnalysisStatStatus, { label: string; color: string; tint: string }> = {
  good: { label: "Balanced", color: colors.sageDark, tint: colors.tealTint },
  monitor: { label: "Monitor", color: colors.terracottaInk, tint: colors.terracottaTint },
  support: { label: "Support", color: colors.metabolicDark, tint: colors.metabolicLighter },
};

export default function AnalysisReportPage() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const report = type === "tcm" || type === "nutrition" ? ANALYSIS_REPORTS[type] : null;

  if (!report) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />} onPress={() => router.back()}>
            Back
          </Button>
        </View>
        <Text style={styles.missing}>That analysis isn&apos;t available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />} onPress={() => router.back()}>
          Back
        </Button>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FadeInView>
          <Text style={[styles.eyebrow, { color: report.accent }]}>{report.eyebrow}</Text>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.subtitle}>{report.subtitle}</Text>

          <View style={styles.reviewer}>
            <ShieldCheck size={15} color={colors.sageDark} />
            <Text style={styles.reviewerText}>{report.reviewer}</Text>
          </View>

          {report.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              {section.body ? <Text style={styles.body}>{section.body}</Text> : null}

              {section.stats && section.stats.length > 0 && (
                <View style={styles.statList}>
                  {section.stats.map((s) => {
                    const meta = s.status ? STATUS_META[s.status] : null;
                    return (
                      <Card key={s.label} padding="lg" style={styles.statCard}>
                        <View style={styles.statTop}>
                          <Text style={styles.statLabel}>{s.label}</Text>
                          {s.value ? <Text style={styles.statValue}>{s.value}</Text> : null}
                          {meta && !s.value ? (
                            <View style={[styles.pill, { backgroundColor: meta.tint }]}>
                              <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                          ) : null}
                        </View>
                        {(s.note || (meta && s.value)) && (
                          <View style={styles.statBottom}>
                            {meta && s.value ? (
                              <View style={[styles.pill, { backgroundColor: meta.tint }]}>
                                <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
                              </View>
                            ) : null}
                            {s.note ? <Text style={styles.statNote}>{s.note}</Text> : null}
                          </View>
                        )}
                      </Card>
                    );
                  })}
                </View>
              )}

              {section.steps && section.steps.length > 0 && (
                <View style={styles.steps}>
                  {section.steps.map((step, i) => (
                    <View key={step} style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: report.accent }]}>
                        <Text style={styles.stepNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <WellnessDisclaimer />
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone, width: "100%", maxWidth: 448, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing["3xl"] },
  missing: { fontFamily: fontFamilies.body, fontSize: fontSizes.bodyMd, color: colors.inkMuted, padding: spacing.xl },
  eyebrow: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.ink,
    letterSpacing: -0.4,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 23,
  },
  reviewer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.tealTint,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: "flex-start",
  },
  reviewerText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.sageDark,
  },
  section: { marginTop: spacing["2xl"] },
  sectionHeading: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    lineHeight: 23,
  },
  statList: { marginTop: spacing.md, gap: spacing.sm },
  statCard: { gap: spacing.sm },
  statTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statLabel: { flex: 1, fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.bodyMd, color: colors.ink },
  statValue: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.ink,
  },
  statBottom: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  pill: { borderRadius: radii.full, paddingVertical: 3, paddingHorizontal: spacing.sm },
  pillText: { fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.overline, textTransform: "uppercase", letterSpacing: 0.4 },
  statNote: { fontFamily: fontFamilies.body, fontSize: fontSizes.caption, color: colors.inkMuted, flexShrink: 1 },
  steps: { marginTop: spacing.md, gap: spacing.md },
  stepRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  stepNum: { width: 22, height: 22, borderRadius: radii.full, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumText: { fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.caption, color: colors.white },
  stepText: { flex: 1, fontFamily: fontFamilies.body, fontSize: fontSizes.bodyMd, color: colors.charcoal, lineHeight: 22 },
});
