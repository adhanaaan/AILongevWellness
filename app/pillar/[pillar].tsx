import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, MessageCircle, ChevronRight } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { FadeInView } from "@/components/ui/FadeInView";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BIOMARKER_KEYS_BY_PILLAR, pillarStatus } from "@/lib/ai/scoring";
import { computeVascularAge, computeMetabolicAge, type AgeClockResult } from "@/lib/ai/ageClocks";
import type { AiDraft, Biomarker, BiomarkerReading, Participant, Pillar } from "@/lib/types/db";
import {
  colors,
  fontFamilies,
  fontSizes,
  fontWeights,
  radii,
  shadows,
  spacing,
} from "@/lib/theme/tokens";

const VALID_PILLARS: Pillar[] = ["vascular", "metabolic", "mental"];

const PILLAR_LABELS: Record<Pillar, string> = {
  vascular: "Vascular",
  metabolic: "Metabolic",
  mental: "Mental",
};

const PILLAR_COLORS: Record<Pillar, string> = {
  vascular: colors.vascular,
  metabolic: colors.metabolic,
  mental: colors.mental,
};

function humanizeKey(key: string) {
  const withSpaces = key.replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

// measured_at is a plain "YYYY-MM-DD" date, not a timestamp -- new Date(str)
// on a date-only string parses as UTC midnight, which can display as the
// previous day in timezones behind UTC. Splitting and building a local Date
// avoids that off-by-one.
function formatShortDate(dateOnly: string) {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDelta(n: number) {
  const rounded = Math.round(Math.abs(n) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export default function PillarDetailPage() {
  const { pillar: pillarParam } = useLocalSearchParams<{ pillar: string }>();
  const router = useRouter();
  const { participantId } = useAuth();
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [history, setHistory] = useState<BiomarkerReading[]>([]);

  const pillar = VALID_PILLARS.includes(pillarParam as Pillar)
    ? (pillarParam as Pillar)
    : null;

  useEffect(() => {
    if (!pillar) {
      router.back();
      return;
    }
    if (!participantId) return;
    const loadData = async () => {
      const [draft, bm, p, hist] = await Promise.all([
        repository.getAiDraft(participantId),
        repository.getBiomarkers(participantId),
        repository.getParticipant(participantId),
        repository.listBiomarkerHistory(participantId),
      ]);
      setAiDraft(draft);
      setBiomarkers(bm);
      setParticipant(p);
      setHistory(hist);
    };
    loadData();
    return repository.subscribe(loadData);
  }, [pillar, participantId]);

  if (!pillar) return null;
  if (!aiDraft) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const score = aiDraft.scores[pillar];
  const status = pillarStatus(score);
  const pillarColor = PILLAR_COLORS[pillar];
  const pillarKeys = BIOMARKER_KEYS_BY_PILLAR[pillar];
  const pillarBiomarkers = biomarkers.filter(
    (b) => b.pillar === pillar && b.value !== null
  );
  const outOfRange = (aiDraft.out_of_range ?? []).filter((o) =>
    pillarKeys.includes(o.key)
  );
  const missing = (aiDraft.missing_biomarkers ?? []).filter((key) =>
    pillarKeys.includes(key)
  );

  let ageClock: AgeClockResult | null = null;
  let ageClockLabel = "";
  if (participant && pillar === "vascular") {
    ageClock = computeVascularAge(aiDraft.chronological_age, biomarkers, participant.smoking);
    ageClockLabel = "Vascular age";
  } else if (participant && pillar === "metabolic") {
    ageClock = computeMetabolicAge(aiDraft.chronological_age, biomarkers, participant.sex);
    ageClockLabel = "Metabolic age";
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />}
          onPress={() => router.back()}
        >
          Back
        </Button>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <FadeInView>
        <View style={styles.titleRow}>
          <Text style={styles.pillarName}>{PILLAR_LABELS[pillar]}</Text>
          <StatusBadge
            status={status}
            label={status === "good" ? "On track" : "Monitor"}
          />
        </View>
        <Text style={[styles.score, { color: pillarColor }]}>{score}</Text>

        {ageClock && (
          <View style={styles.ageClockCard}>
            <View style={styles.ageClockHeader}>
              <Text style={styles.ageClockLabel}>{ageClockLabel}</Text>
              <Text style={[styles.ageClockValue, { color: pillarColor }]}>{ageClock.age}</Text>
            </View>
            {ageClock.drivers.length > 0 ? (
              <View style={styles.ageClockDrivers}>
                {ageClock.drivers.map((d) => (
                  <Text key={d.label} style={styles.ageClockDriverText}>
                    {d.years >= 0 ? "+" : ""}
                    {d.years}y — {d.label}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.ageClockDriverText}>No factors trending outside range right now.</Text>
            )}
            <Button
              variant="ghost"
              size="sm"
              style={styles.ageClockLink}
              onPress={() => router.push("/methodology")}
            >
              How this is calculated & referenced
            </Button>
          </View>
        )}

        {pillarBiomarkers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your markers</Text>
            <View style={styles.grid}>
              {pillarBiomarkers.map((b) => {
                // history includes the reading that produced today's current
                // value too, so the second-to-last entry (not the last) is
                // the actual "previous" reading to compare against.
                const readings = history
                  .filter((r) => r.key === b.key)
                  .sort((x, y) => x.measured_at.localeCompare(y.measured_at));
                const previous = readings.length >= 2 ? readings[readings.length - 2] : null;
                const delta = previous && b.value !== null ? b.value - previous.value : null;

                return (
                  <View key={b.id} style={styles.statCard}>
                    <Text style={styles.statLabel}>{b.label}</Text>
                    <Text style={styles.statValue}>
                      {b.value}
                      <Text style={styles.statUnit}> {b.unit}</Text>
                    </Text>
                    {b.ref_low !== null && b.ref_high !== null && (
                      <Text style={styles.statRef}>
                        Ref: {b.ref_low}-{b.ref_high}
                      </Text>
                    )}
                    {previous && delta !== null && (
                      <Text style={styles.statTrend}>
                        {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {formatDelta(delta)} since{" "}
                        {formatShortDate(previous.measured_at)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {outOfRange.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Areas to monitor</Text>
            {outOfRange.map((o) => (
              <View key={o.key} style={[styles.flagRow, styles.flagRowMonitor]}>
                <Text style={styles.flagText}>
                  {humanizeKey(o.key)}: {o.value} (reference up to {o.ref_high})
                </Text>
              </View>
            ))}
          </View>
        )}

        {missing.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Not yet captured</Text>
            {missing.map((key) => (
              <View key={key} style={[styles.flagRow, styles.flagRowMissing]}>
                <Text style={styles.flagText}>{humanizeKey(key)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ask Ava</Text>
          {/* One targeted question per flagged marker (capped at 3 to avoid a
              wall of chips), mirroring how contextual quick-questions read
              elsewhere -- a generic "ask about this score" button makes the
              participant do the work of framing a question themselves. */}
          {outOfRange.slice(0, 3).map((o) => (
            <Pressable
              key={o.key}
              style={styles.askAvaRow}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/ava",
                  params: { q: `What might help with my ${humanizeKey(o.key).toLowerCase()}?` },
                })
              }
            >
              <MessageCircle size={16} color={colors.sageDark} />
              <Text style={styles.askAvaRowText}>
                What might help with my {humanizeKey(o.key).toLowerCase()}?
              </Text>
              <ChevronRight size={16} color={colors.inkMuted} />
            </Pressable>
          ))}
          <Pressable
            style={styles.askAvaRow}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/ava",
                params: {
                  q: `Can you tell me more about my ${PILLAR_LABELS[pillar].toLowerCase()} score?`,
                },
              })
            }
          >
            <MessageCircle size={16} color={colors.sageDark} />
            <Text style={styles.askAvaRowText}>
              Ask about my {PILLAR_LABELS[pillar].toLowerCase()} score
            </Text>
            <ChevronRight size={16} color={colors.inkMuted} />
          </Pressable>
        </View>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  pillarName: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineLg,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  score: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.display,
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing["2xl"],
  },
  ageClockCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.xl,
    ...shadows.card,
  },
  ageClockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ageClockLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  ageClockValue: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineMd,
    fontWeight: fontWeights.semibold,
  },
  ageClockDrivers: {
    marginTop: spacing.sm,
    gap: 4,
  },
  ageClockDriverText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  ageClockLink: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -(spacing.sm / 2),
  },
  statCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    margin: "1%",
    ...shadows.card,
  },
  statLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  statValue: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginTop: spacing.xs,
  },
  statUnit: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.inkMuted,
  },
  statRef: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  statTrend: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  flagRow: {
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  flagRowMonitor: {
    borderLeftColor: colors.terracotta,
  },
  flagRowMissing: {
    borderLeftColor: colors.borderStrong,
  },
  flagText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  askAvaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  askAvaRowText: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
});
