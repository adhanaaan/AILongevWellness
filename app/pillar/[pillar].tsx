import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BIOMARKER_KEYS_BY_PILLAR, pillarStatus } from "@/lib/ai/scoring";
import type { AiDraft, Biomarker, Pillar } from "@/lib/types/db";
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

export default function PillarDetailPage() {
  const { pillar: pillarParam } = useLocalSearchParams<{ pillar: string }>();
  const router = useRouter();
  const { participantId } = useAuth();
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);

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
      const [draft, bm] = await Promise.all([
        repository.getAiDraft(participantId),
        repository.getBiomarkers(participantId),
      ]);
      setAiDraft(draft);
      setBiomarkers(bm);
    };
    loadData();
    return repository.subscribe(loadData);
  }, [pillar, participantId]);

  if (!pillar || !aiDraft) return null;

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
        <View style={styles.titleRow}>
          <Text style={styles.pillarName}>{PILLAR_LABELS[pillar]}</Text>
          <StatusBadge
            status={status}
            label={status === "good" ? "On track" : "Monitor"}
          />
        </View>
        <Text style={[styles.score, { color: pillarColor }]}>{score}</Text>

        {pillarBiomarkers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your markers</Text>
            <View style={styles.grid}>
              {pillarBiomarkers.map((b) => (
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
                </View>
              ))}
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
          <Button
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/ava",
                params: {
                  q: `Can you tell me more about my ${PILLAR_LABELS[pillar].toLowerCase()} score?`,
                },
              })
            }
          >
            Ask Ava about this score
          </Button>
        </View>
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
});
