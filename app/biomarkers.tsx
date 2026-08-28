import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { FadeInView } from "@/components/ui/FadeInView";
import { BiomarkerRangeRow } from "@/components/participant/BiomarkerRangeRow";
import { BiomarkerSummaryBar } from "@/components/participant/BiomarkerSummaryBar";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BIOMARKER_KEYS_BY_PILLAR } from "@/lib/ai/scoring";
import { biomarkerLabel } from "@/lib/ai/biomarkerLabels";
import type { AiDraft, Biomarker, BiomarkerReading, Pillar } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

const PILLAR_ORDER: Pillar[] = ["vascular", "metabolic", "mental"];
const PILLAR_LABELS: Record<Pillar, string> = {
  vascular: "Heart & vascular",
  metabolic: "Metabolic & general",
  mental: "Cognitive",
};
const PILLAR_COLORS: Record<Pillar, string> = {
  vascular: colors.vascular,
  metabolic: colors.metabolic,
  mental: colors.mental,
};

// Real catalog label (e.g. who5_wellbeing -> "Wellbeing (WHO-5)"), not a
// titleized key.
function humanizeKey(key: string) {
  return biomarkerLabel(key);
}

function formatShortDate(dateOnly: string) {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDelta(n: number) {
  const rounded = Math.round(Math.abs(n) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export default function BiomarkersPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [aiDraft, setAiDraft] = useState<AiDraft | null | undefined>(undefined);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [history, setHistory] = useState<BiomarkerReading[]>([]);

  useEffect(() => {
    if (!participantId) return;
    const load = async () => {
      const [draft, bm, hist] = await Promise.all([
        repository.getAiDraft(participantId),
        repository.getBiomarkers(participantId),
        repository.listBiomarkerHistory(participantId),
      ]);
      setAiDraft(draft);
      setBiomarkers(bm);
      setHistory(hist);
    };
    load();
    return repository.subscribe(load);
  }, [participantId]);

  if (aiDraft === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Button variant="ghost" size="sm" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />} onPress={() => router.back()}>
            Back
          </Button>
        </View>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const captured = biomarkers.filter((b) => b.value !== null);
  const inRange = captured.filter((b) => !b.flagged).length;
  const outOfRange = captured.filter((b) => b.flagged).length;
  const notCaptured = aiDraft?.missing_biomarkers?.length ?? 0;

  const trendFor = (b: Biomarker): string | null => {
    const readings = history
      .filter((r) => r.key === b.key)
      .sort((x, y) => x.measured_at.localeCompare(y.measured_at));
    const previous = readings.length >= 2 ? readings[readings.length - 2] : null;
    if (!previous || b.value === null) return null;
    const delta = b.value - previous.value;
    const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
    return `${arrow} ${formatDelta(delta)} since ${formatShortDate(previous.measured_at)}`;
  };

  // Group captured markers by pillar; flagged first within each group so the
  // things worth attention rise to the top.
  const groups = PILLAR_ORDER.map((pillar) => {
    const items = captured
      .filter((b) => b.pillar === pillar)
      .sort((a, b) => Number(b.flagged) - Number(a.flagged) || a.label.localeCompare(b.label));
    const missing = (aiDraft?.missing_biomarkers ?? []).filter((k) =>
      BIOMARKER_KEYS_BY_PILLAR[pillar].includes(k)
    );
    return { pillar, items, missing };
  }).filter((g) => g.items.length > 0 || g.missing.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />} onPress={() => router.back()}>
          Back
        </Button>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FadeInView>
          <Text style={styles.title}>Your biomarkers</Text>
          <Text style={styles.subtitle}>
            {captured.length} measured across your panels
          </Text>

          <View style={styles.summaryWrap}>
            <BiomarkerSummaryBar inRange={inRange} outOfRange={outOfRange} notCaptured={notCaptured} />
          </View>

          {groups.map((g) => (
            <View key={g.pillar} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: PILLAR_COLORS[g.pillar] }]} />
                <Text style={styles.groupTitle}>{PILLAR_LABELS[g.pillar]}</Text>
                <Text style={styles.groupCount}>{g.items.length}</Text>
              </View>

              <View style={styles.rows}>
                {g.items.map((b) => (
                  <BiomarkerRangeRow
                    key={b.id}
                    label={b.label}
                    value={b.value as number}
                    unit={b.unit}
                    refLow={b.ref_low}
                    refHigh={b.ref_high}
                    flagged={b.flagged}
                    trend={trendFor(b)}
                  />
                ))}
              </View>

              {g.missing.length > 0 && (
                <View style={styles.missingWrap}>
                  <Text style={styles.missingLabel}>Not yet captured</Text>
                  <View style={styles.missingChips}>
                    {g.missing.map((k) => (
                      <View key={k} style={styles.missingChip}>
                        <Text style={styles.missingChipText}>{humanizeKey(k)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))}

          {captured.length === 0 && (
            <Text style={styles.empty}>
              No biomarkers captured yet. Add a lab report or connect a device to start filling
              in your panel.
            </Text>
          )}

          <Text style={styles.footNote}>
            Reference ranges are general wellness targets, not a diagnosis. Your care team reviews
            every value before your snapshot is signed off.
          </Text>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone, width: "100%", maxWidth: 448, alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing["4xl"] },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineLg,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: 4,
  },
  summaryWrap: { marginTop: spacing.xl },
  group: { marginTop: spacing["2xl"] },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  groupDot: { width: 8, height: 8, borderRadius: radii.full },
  groupTitle: {
    flex: 1,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  groupCount: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  rows: { gap: spacing.md },
  missingWrap: { marginTop: spacing.md },
  missingLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  missingChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  missingChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  missingChipText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  empty: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing["2xl"],
    lineHeight: 22,
  },
  footNote: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: spacing["3xl"],
  },
});
