import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { FadeInView } from "@/components/ui/FadeInView";
import { WellnessDisclaimer } from "@/components/participant/WellnessDisclaimer";
import { AskAvaButton } from "@/components/participant/AskAvaButton";
import { TrendEmptyState } from "@/components/participant/TrendEmptyState";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { pillarStatus, BIOMARKER_KEYS_BY_PILLAR } from "@/lib/ai/scoring";
import { missingPhenoAgeInputs } from "@/lib/ai/phenoAge";
import type { SignedCard } from "@/lib/data/repository";
import type { Pillar } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, fontWeights, radii, shadows, spacing } from "@/lib/theme/tokens";

const NEUTRAL_SCORE = 70;
const PILLARS: Pillar[] = ["vascular", "metabolic", "mental"];

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

export default function BioAgePage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [card, setCard] = useState<SignedCard | null | undefined>(undefined);

  useEffect(() => {
    if (!participantId) return;
    async function load() {
      const signed = await repository.getSignedCard(participantId!);
      if (signed) {
        setCard(signed);
        return;
      }
      // Pre-sign-off (the normal review-window state): no signed card yet, but a
      // draft exists. Fall back to it so this drill-down works during review,
      // mirroring app/(tabs)/card.tsx — otherwise the reveal's "How this is
      // calculated" link and the AVA bio-age chip bounce straight back.
      const [draft, biomarkers, participant] = await Promise.all([
        repository.getAiDraft(participantId!),
        repository.getBiomarkers(participantId!),
        repository.getParticipant(participantId!),
      ]);
      if (draft && participant) {
        setCard({ participant, aiDraft: draft, biomarkers, reviews: [] });
      } else {
        setCard(null);
      }
    }
    load();
    return repository.subscribe(load);
  }, [participantId]);

  if (card === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }
  if (!card) {
    router.back();
    return null;
  }

  const { aiDraft, biomarkers } = card;
  const { scores, biological_age: bioAge, chronological_age: chronoAge } = aiDraft;
  const usedPhenoAge = missingPhenoAgeInputs(biomarkers).length === 0;
  // Same honesty gate as the Insights hero: a whole-body biological age isn't
  // trustworthy while any pillar has no data (the composite would treat it as
  // neutral). Below that bar, show what's needed instead of a fabricated number.
  const missingSet = new Set(aiDraft.missing_biomarkers ?? []);
  const bioAgeReady = (Object.keys(BIOMARKER_KEYS_BY_PILLAR) as Pillar[]).every(
    (p) => !BIOMARKER_KEYS_BY_PILLAR[p].every((k) => missingSet.has(k))
  );
  const avg = Math.round((scores.vascular + scores.metabolic + scores.mental) / 3);
  const rawDelta = avg - NEUTRAL_SCORE;
  const appliedDelta = Math.max(-15, Math.min(10, rawDelta));
  const wasCapped = rawDelta !== appliedDelta;

  const delta = chronoAge - bioAge;
  const deltaLabel =
    delta > 0 ? `${delta} years younger` : delta < 0 ? `${Math.abs(delta)} years older` : "On pace with your age";

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FadeInView style={styles.fadeIn}>
        <Text style={styles.pageTitle}>Biological age</Text>

        <Card padding="lg" style={styles.heroCard}>
          <Text style={styles.heroCaption}>Your estimated biological age</Text>
          {bioAgeReady ? (
            <>
              <Text style={styles.bioAgeValue}>{bioAge}</Text>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{deltaLabel}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.bioAgeLocked}>
              Your biological age unlocks once we have data across all three systems — Vascular,
              Metabolic, and Mental. Add your labs and complete ReCOGnAIze to see it.
            </Text>
          )}
        </Card>

        {bioAgeReady && (
        <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How this is calculated</Text>
          <Card padding="lg" style={styles.explainerCard}>
          {usedPhenoAge ? (
            <>
              <Text style={styles.paragraph}>
                Your biological age of {bioAge} is calculated with PhenoAge (Levine et al., 2018), a published
                formula built from nine blood biomarkers — albumin, creatinine, glucose, CRP, lymphocyte percent,
                MCV, RDW, alkaline phosphatase, and white blood cell count — alongside your chronological age of{" "}
                {chronoAge}. In the study it was developed on, it tracked long-term health outcomes more closely
                than chronological age alone.
              </Text>
              <Text style={styles.paragraph}>
                This is a real, published clinical formula computed directly from your lab values — not our own
                estimate. See the full citation and calculation on the Methodology page.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.paragraph}>
                Your three pillar scores average to {avg}, compared with a neutral baseline of {NEUTRAL_SCORE}. That
                {rawDelta >= 0 ? " surplus" : " shortfall"} of {Math.abs(rawDelta)} points
                {wasCapped ? `, capped to a maximum adjustment of ${Math.abs(appliedDelta)} years,` : ""} shifts your
                biological age {appliedDelta >= 0 ? "younger" : "older"} than your chronological age of {chronoAge}.
              </Text>
              <Text style={styles.paragraph}>
                This is our own composite estimate, not a diagnosis and not the same as a specific named clinical
                biological-age formula. A complete blood count and metabolic panel unlocks PhenoAge — a published
                formula with a stronger evidence base — see the Methodology page for what's still needed.
              </Text>
            </>
          )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What drove the average</Text>
          {PILLARS.map((pillar) => {
            const score = scores[pillar];
            const status = pillarStatus(score);
            return (
              <TouchableOpacity
                key={pillar}
                style={styles.pillarRow}
                onPress={() => router.push(`/pillar/${pillar}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.pillarDot, { backgroundColor: PILLAR_COLORS[pillar] }]} />
                <Text style={styles.pillarLabel}>{PILLAR_LABELS[pillar]}</Text>
                <Text style={[styles.pillarScore, status === "monitor" && styles.pillarScoreMonitor]}>{score}</Text>
                <ChevronRight size={16} color={colors.inkMuted} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.overline}>Biological age over time</Text>
          <TrendEmptyState
            message="This is your first biological age. We'll chart how it moves as you re-test over time — nothing before today is estimated or filled in."
            currentValue={bioAge}
            unit="yrs"
            color={colors.sage}
          />
        </View>
        </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ask Ava</Text>
          <AskAvaButton question="How can I improve my biological age?" />
          <AskAvaButton question="What is biological age, and why does it differ from my real age?" />
        </View>

        <TouchableOpacity style={styles.methodologyLink} onPress={() => router.push("/methodology")}>
          <Text style={styles.methodologyLinkText}>See full methodology & sources</Text>
          <ChevronRight size={16} color={colors.sageDark} />
        </TouchableOpacity>
          <WellnessDisclaimer />
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
    alignItems: "center",
  },
  fadeIn: {
    width: "100%",
    alignItems: "center",
  },
  pageTitle: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineLg,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    alignSelf: "flex-start",
  },
  heroCard: {
    width: "100%",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing["2xl"],
  },
  heroCaption: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  bioAgeValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.display,
    color: colors.charcoal,
    marginTop: spacing.sm,
  },
  bioAgeLocked: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  explainerCard: {
    width: "100%",
  },
  pill: {
    marginTop: spacing.md,
    backgroundColor: colors.amberLighter,
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  pillText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.terracottaInk,
  },
  section: {
    width: "100%",
    marginTop: spacing["2xl"],
  },
  sectionTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  overline: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  paragraph: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  pillarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  pillarDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  pillarLabel: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  pillarScore: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  pillarScoreMonitor: {
    color: colors.terracottaInk,
  },
  methodologyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing["2xl"],
  },
  methodologyLinkText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.sageDark,
  },
});
