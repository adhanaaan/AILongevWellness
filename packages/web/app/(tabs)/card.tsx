import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MessageCircle, ClipboardList, ChevronRight } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { FadeInView } from "@/components/ui/FadeInView";
import { PressableScale } from "@/components/ui/PressableScale";
import { InsightsSkeleton } from "@/components/participant/InsightsSkeleton";
import { BodyMap } from "@/components/participant/BodyMap";
import { BioAgeReveal } from "@/components/participant/BioAgeReveal";
import { BiomarkerSummaryBar } from "@/components/participant/BiomarkerSummaryBar";
import { KeyBiomarkersSection } from "@/components/participant/KeyBiomarkersSection";
import { KeyContributorItem } from "@/components/participant/KeyContributorItem";
import { SuggestedFocusGrid } from "@/components/participant/SuggestedFocusGrid";
import { SnapshotPending } from "@/components/participant/SnapshotPending";
import { CareTeamNotesCard } from "@/components/participant/CareTeamNotesCard";
import { DraftStatusBadge } from "@/components/participant/DraftStatusBadge";
import { PillarScoreCard } from "@/components/participant/PillarScoreCard";
import { MonitorMetricCard } from "@/components/participant/MonitorMetricCard";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { TopRecommendation } from "@/components/participant/TopRecommendation";
import { InsightsSectionHeader } from "@/components/participant/InsightsSectionHeader";
import { NextStepsCard } from "@/components/participant/NextStepsCard";
import { SnapshotSummaryCard } from "@/components/participant/SnapshotSummaryCard";
import { WellnessDisclaimer } from "@/components/participant/WellnessDisclaimer";
import { repository } from "@/lib/data/mock";
import { getOnboardingProgressAction } from "@/lib/data/actions";
import { useAskAva } from "@/lib/ava/useAskAva";
import { useAuth } from "@/lib/auth/AuthProvider";
import { pillarStatus, buildPillarNarrative, BIOMARKER_KEYS_BY_PILLAR } from "@/lib/ai/scoring";
import { isCaptureComplete } from "@/lib/onboarding/flow";
import type { SignedCard } from "@/lib/data/repository";
import type { AiDraft, Biomarker, OnboardingProgress, Participant, Pipeline, Pillar } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, lineHeights, radii, shadows, spacing } from "@/lib/theme/tokens";

const PILLAR_COLOR: Record<string, string> = {
  vascular: colors.vascular,
  metabolic: colors.metabolic,
  mental: colors.mental,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CardPage() {
  const router = useRouter();
  const ask = useAskAva();
  const { participantId } = useAuth();
  const [card, setCard] = useState<SignedCard | null | undefined>(undefined);
  const [pipeline, setPipeline] = useState<Pipeline | null | undefined>(undefined);
  const [pendingDraft, setPendingDraft] = useState<AiDraft | null | undefined>(undefined);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [showAllContributors, setShowAllContributors] = useState(false);

  const load = useCallback(() => {
    if (!participantId) return;
    // .catch on the three gating fetches so a transient Supabase/RLS error
    // degrades to the pending state instead of an infinite skeleton (they only
    // resolve to null on the happy empty path otherwise).
    repository.getSignedCard(participantId).then(setCard).catch(() => setCard(null));
    repository.getPipeline(participantId).then(setPipeline).catch(() => setPipeline(null));
    repository.getParticipant(participantId).then(setParticipant).catch(() => setParticipant(null));
    repository.getBiomarkers(participantId).then(setBiomarkers).catch(() => setBiomarkers([]));
    // Only actually used pre-delivery (see the !card branch below) -- fetched
    // unconditionally here so it's ready the moment the pipeline advances,
    // rather than adding a second effect keyed on pipeline state.
    repository.getAiDraft(participantId).then(setPendingDraft).catch(() => setPendingDraft(null));
    // Drives the "Continue your data capture" banner below -- a participant
    // who lands here (via the Data Capture hub's insights preview banner)
    // before finishing every section otherwise has no way back except the
    // browser back button, since (tabs) has no link into onboarding.
    getOnboardingProgressAction(participantId).then(setOnboardingProgress);
  }, [participantId]);

  useEffect(() => {
    load();
    return repository.subscribe(load);
  }, [load]);

  // A server-side AI draft/sign-off completes without any local write, so
  // repository.subscribe never fires for it — the screen would stay on the
  // pending state until a full reload. Refetch whenever the tab regains focus.
  useFocusEffect(load);

  if (card === undefined || pipeline === undefined || pendingDraft === undefined) {
    return (
      <MobileShell>
        <InsightsSkeleton />
      </MobileShell>
    );
  }

  // Show the AI's first-pass draft the moment one exists, rather than hiding
  // everything until full delivery -- DraftStatusBadge below is what keeps the
  // "this hasn't been reviewed yet" line visible the whole time it's up.
  if (!card && !pendingDraft) {
    return (
      <MobileShell name={participant?.name}>
        <SnapshotPending pipelineState="capturing" />
      </MobileShell>
    );
  }

  const isDelivered = Boolean(card);
  const aiDraft = card?.aiDraft ?? pendingDraft!;
  const reviews = card?.reviews ?? [];
  const gp = reviews.find((r) => r.stage === "gp");
  const tcm = reviews.find((r) => r.stage === "tcm");
  const missingCount = aiDraft.missing_biomarkers?.length ?? 0;
  const firstName = (card?.participant.name ?? participant?.name ?? "").trim().split(/\s+/)[0] || undefined;

  // Fresh account: a draft exists (from the quick quiz) but no biomarkers have
  // been captured yet, so the bio-age hero + pillars would render as empty
  // dashes — which reads as broken, not premium. Show the polished "build your
  // snapshot" pending state instead until at least one real value lands.
  //
  // Force the "capturing" (Add your data) step regardless of pipeline state: the
  // quiz advances the pipeline to gp_review, which would otherwise flip this
  // screen to "your care team is reviewing your results" and HIDE the upload CTA
  // — false (there's nothing to review with no data) and a dead end. With no
  // data, the honest, useful screen is always "add your labs/reports".
  const totalMarkers = Object.values(BIOMARKER_KEYS_BY_PILLAR).flat().length;
  if (!isDelivered && missingCount >= totalMarkers) {
    return (
      <MobileShell name={card?.participant.name ?? participant?.name}>
        <SnapshotPending pipelineState="capturing" />
      </MobileShell>
    );
  }

  const askAva = () => ask("Can you walk me through what's driving my scores?");

  const topFocus = aiDraft.suggested_focus[0];
  const topDiscussionPoint = aiDraft.discussion_points[0];
  const totalRecommendations = aiDraft.suggested_focus.length + aiDraft.discussion_points.length;
  const consumedRecommendations = (topFocus ? 1 : 0) + (topDiscussionPoint ? 1 : 0);
  const remainingRecommendations = Math.max(0, totalRecommendations - consumedRecommendations);

  const pillarItems = [
    {
      key: "vascular",
      label: "Vascular",
      value: aiDraft.scores.vascular,
      status: pillarStatus(aiDraft.scores.vascular),
      onPress: () => router.push("/pillar/vascular"),
      accessibilityLabel: "View details for Vascular score",
    },
    {
      key: "metabolic",
      label: "Metabolic",
      value: aiDraft.scores.metabolic,
      status: pillarStatus(aiDraft.scores.metabolic),
      onPress: () => router.push("/pillar/metabolic"),
      accessibilityLabel: "View details for Metabolic score",
    },
    {
      key: "mental",
      label: "Mental",
      value: aiDraft.scores.mental,
      status: pillarStatus(aiDraft.scores.mental),
      onPress: () => router.push("/pillar/mental"),
      accessibilityLabel: "View details for Mental score",
    },
  ] as const;

  // A body region stays "locked" (no score) until its pillar has at least one
  // captured biomarker -- so the hero fills in as the participant captures data.
  const missingSet = new Set(aiDraft.missing_biomarkers ?? []);
  const bodyPillars = pillarItems.map((p) => ({
    key: p.key,
    value: BIOMARKER_KEYS_BY_PILLAR[p.key].every((k) => missingSet.has(k)) ? null : p.value,
    onPress: p.onPress,
    accessibilityLabel: p.accessibilityLabel,
  }));

  // Biological age is a whole-body composite of the three pillars. If any pillar
  // has no data (renders as "–"), a confident age + "N years younger" would be
  // built partly on absent data (the composite silently treats an empty pillar
  // as neutral) -- dishonest, and visibly contradicts the dashes below it. Only
  // show the number once every pillar has data; otherwise the hero shows a
  // "unlocks as you add data" state.
  const bioAgeReady = bodyPillars.every((p) => p.value !== null);
  // Pillars with no captured data — the summary must not call these "strong"
  // (their neutral default score would), which would contradict the locked body map.
  const lockedPillars = bodyPillars.filter((p) => p.value === null).map((p) => p.key as Pillar);

  // Scannable marker summary (replaces the wordier repeat of the pillar scores,
  // which the body hero above already shows). Counts derive from the draft alone.
  const markerTotal = Object.values(BIOMARKER_KEYS_BY_PILLAR).flat().length;
  const markerNotCaptured = aiDraft.missing_biomarkers?.length ?? 0;
  const markerOutOfRange = aiDraft.out_of_range?.length ?? 0;
  const markerInRange = Math.max(0, markerTotal - markerNotCaptured - markerOutOfRange);

  // Flagged markers are now shown as plotted cards (MonitorMetricCard) in their
  // own "Areas to monitor" section, so "Driving your scores" keeps only the
  // positive/context drivers as prose — no number-in-prose duplication.
  const outOfRangeItems = aiDraft.out_of_range ?? [];
  const goodContributors = aiDraft.key_contributors.filter((c) => c.tone !== "monitor");
  const visibleContributors = showAllContributors
    ? goodContributors
    : goodContributors.slice(0, 3);

  return (
    <MobileShell name={card?.participant.name ?? participant?.name}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <FadeInView>
        <Text style={styles.title}>Your wellness snapshot</Text>
        <Text style={styles.subtitle}>
          {isDelivered ? "Report generated" : "Drafted"} {formatDate(aiDraft.generated_at)}
        </Text>
        <DraftStatusBadge isDelivered={isDelivered} gp={gp} tcm={tcm} missingCount={missingCount} />

        {!isDelivered && onboardingProgress && !isCaptureComplete(onboardingProgress) && (
          <Pressable
            onPress={() => router.push("/onboarding/capture")}
            accessibilityRole="button"
            style={styles.captureBanner}
          >
            <ClipboardList size={18} color={colors.sageDark} />
            <Text style={styles.captureBannerText}>Add your data to sharpen your snapshot</Text>
            <ChevronRight size={18} color={colors.sageDark} />
          </Pressable>
        )}

        <View style={styles.section}>
          {bioAgeReady ? (
            // The reveal: premium forest-dark hero — big biological-age number,
            // younger/older delta, plain-English read, and three pillar rings —
            // the signed-off snapshot design. BodyMap stays as the partial-data
            // fallback; the all-empty case is handled above (SnapshotPending).
            <BioAgeReveal
              bioAge={aiDraft.biological_age}
              chronoAge={aiDraft.chronological_age}
              name={firstName}
              narrative={buildPillarNarrative(aiDraft.scores, lockedPillars)}
              pillars={pillarItems.map((p) => ({
                key: p.key,
                label: p.label,
                value: p.value,
                onPress: p.onPress,
                accessibilityLabel: p.accessibilityLabel,
              }))}
              onPressBio={() => router.push("/bio-age")}
            />
          ) : (
            <BodyMap
              bioAge={null}
              chronoAge={aiDraft.chronological_age}
              pillars={bodyPillars}
              onPressBio={undefined}
            />
          )}
        </View>

        {!bioAgeReady && (
          <View style={styles.narrativeSection}>
            <SnapshotSummaryCard narrative={buildPillarNarrative(aiDraft.scores, lockedPillars)} />
          </View>
        )}

        {/* Prominent-number pillar cards, each plotted against the ideal band and
            tappable to open the full detail. Retreat feedback: more cards, bigger
            numbers, plot against ideal, header + number -> tap to read the rest;
            a not-yet-assessed pillar shows a preview instead of a fake score. */}
        <View style={styles.section}>
          <InsightsSectionHeader label="Your three systems" />
          {pillarItems.map((p) => {
            const pillarMarkers = biomarkers.filter((b) => b.pillar === p.key && b.value !== null);
            const pillarMissing = (aiDraft.missing_biomarkers ?? [])
              .filter((k) => BIOMARKER_KEYS_BY_PILLAR[p.key].includes(k))
              .slice(0, 3);
            return (
              <PillarScoreCard
                key={p.key}
                name={p.label}
                score={lockedPillars.includes(p.key as Pillar) ? null : p.value}
                status={p.status}
                color={PILLAR_COLOR[p.key]}
                markers={pillarMarkers}
                previewKeys={pillarMissing}
                onOpenDetail={p.onPress}
              />
            );
          })}
        </View>

        {(gp || tcm) && (
          <View style={styles.section}>
            <CareTeamNotesCard gp={gp} tcm={tcm} />
          </View>
        )}

        <View style={styles.section}>
          {biomarkers.some((b) => b.value !== null) ? (
            <KeyBiomarkersSection
              biomarkers={biomarkers}
              notCaptured={markerNotCaptured}
              onSeeAll={() => router.push("/biomarkers")}
            />
          ) : (
            <BiomarkerSummaryBar
              inRange={markerInRange}
              outOfRange={markerOutOfRange}
              notCaptured={markerNotCaptured}
            />
          )}
        </View>

        {outOfRangeItems.length > 0 && (
          <View style={styles.section}>
            <InsightsSectionHeader label="Areas to monitor" />
            {outOfRangeItems.slice(0, 4).map((o) => (
              <MonitorMetricCard key={o.key} item={o} />
            ))}
            {outOfRangeItems.length > 4 && (
              <Pressable
                onPress={() => router.push("/biomarkers")}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.seeAll}
              >
                <Text style={styles.seeAllText}>See all {outOfRangeItems.length}</Text>
                <ChevronRight size={14} color={colors.sageDark} />
              </Pressable>
            )}
          </View>
        )}

        {goodContributors.length > 0 && (
          <View style={styles.section}>
            <InsightsSectionHeader label="What's going well" />
            <View style={styles.contributorList}>
              {visibleContributors.map((c) => (
                <KeyContributorItem key={c.text} text={c.text} tone={c.tone} />
              ))}
            </View>
            {goodContributors.length > 3 && (
              <Pressable
                onPress={() => setShowAllContributors((v) => !v)}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.seeAll}
              >
                <Text style={styles.seeAllText}>
                  {showAllContributors ? "Show less" : `See all ${goodContributors.length}`}
                </Text>
                <ChevronRight size={14} color={colors.sageDark} />
              </Pressable>
            )}
          </View>
        )}

        {(topFocus || topDiscussionPoint) && (
          <View style={styles.section}>
            <InsightsSectionHeader label="Your next steps" />
            <TopRecommendation
              topFocus={topFocus}
              topDiscussionPoint={topDiscussionPoint}
              remainingCount={remainingRecommendations}
              expanded={showAllRecommendations}
              onToggleExpanded={() => setShowAllRecommendations((v) => !v)}
            />
            {showAllRecommendations && (
              <View style={styles.expanded}>
                <SuggestedFocusGrid items={aiDraft.suggested_focus} />
                <View style={styles.nextStepsCard}>
                  <NextStepsCard points={aiDraft.discussion_points} />
                </View>
              </View>
            )}
          </View>
        )}

        <WellnessDisclaimer />
        </FadeInView>
      </ScrollView>

      {/* Soft fade so scrolling content dissolves before it reaches the floating
          Ask Ava button, instead of colliding with it. */}
      <View style={styles.askAvaScrim} pointerEvents="none">
        <GradientOverlay
          stops={[
            { offset: "0", color: "rgba(250,250,250,0)" },
            { offset: "1", color: "rgba(250,250,250,0.96)" },
          ]}
        />
      </View>

      <PressableScale
        onPress={askAva}
        haptics="light"
        accessibilityRole="button"
        accessibilityLabel="Ask Ava a follow-up question"
        containerStyle={styles.askAvaFabPos}
        style={styles.askAvaFab}
      >
        <MessageCircle size={18} color={colors.white} />
        <Text style={styles.askAvaFabText}>Ask Ava</Text>
      </PressableScale>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 132 },
  askAvaScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
  },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineLg,
    lineHeight: lineHeights.headlineLg,
    letterSpacing: -0.5,
    color: colors.charcoal,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: 2,
  },
  captureBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 16,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.sageTint,
  },
  captureBannerText: {
    flex: 1,
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.sageDark,
  },
  section: { marginTop: spacing["3xl"] },
  narrativeSection: { marginTop: spacing.lg },
  contributorList: { gap: spacing.md },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  seeAllText: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.sageDark,
  },
  expanded: { marginTop: 16 },
  nextStepsCard: { marginTop: 12 },
  askAvaFabPos: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xl,
  },
  askAvaFab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.sage,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.elevated,
  },
  askAvaFabText: {
    fontSize: fontSizes.bodyMd,
    fontWeight: "600",
    color: colors.white,
  },
});
