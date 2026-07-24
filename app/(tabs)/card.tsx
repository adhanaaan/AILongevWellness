import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { BiologicalAgeHero } from "@/components/participant/BiologicalAgeHero";
import { PillarStrip } from "@/components/participant/PillarStrip";
import { KeyContributorItem } from "@/components/participant/KeyContributorItem";
import { SuggestedFocusGrid } from "@/components/participant/SuggestedFocusGrid";
import { SnapshotPending } from "@/components/participant/SnapshotPending";
import { CareTeamNotesCard } from "@/components/participant/CareTeamNotesCard";
import { TopRecommendation } from "@/components/participant/TopRecommendation";
import { NextStepsCard } from "@/components/participant/NextStepsCard";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { pillarStatus, buildPillarNarrative } from "@/lib/ai/scoring";
import type { SignedCard } from "@/lib/data/repository";
import type { Pipeline } from "@/lib/types/db";
import { colors, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CardPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [card, setCard] = useState<SignedCard | null | undefined>(undefined);
  const [pipeline, setPipeline] = useState<Pipeline | null | undefined>(undefined);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  useEffect(() => {
    if (!participantId) return;
    repository.getSignedCard(participantId).then(setCard);
    repository.getPipeline(participantId).then(setPipeline);
    return repository.subscribe(() => {
      repository.getSignedCard(participantId).then(setCard);
      repository.getPipeline(participantId).then(setPipeline);
    });
  }, [participantId]);

  if (card === undefined || pipeline === undefined) return null;

  if (!card) {
    return (
      <MobileShell>
        <SnapshotPending pipelineState={pipeline?.state ?? "capturing"} />
      </MobileShell>
    );
  }

  const { aiDraft, reviews } = card;
  const gp = reviews.find((r) => r.stage === "gp");
  const tcm = reviews.find((r) => r.stage === "tcm");

  const askAva = () =>
    router.push({
      pathname: "/(tabs)/ava",
      params: { q: "Can you walk me through what's driving my scores?" },
    });

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

  return (
    <MobileShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Your wellness snapshot</Text>
        <Text style={styles.subtitle}>
          Report generated {formatDate(aiDraft.generated_at)}
        </Text>

        <View style={styles.section}>
          <BiologicalAgeHero
            bioAge={aiDraft.biological_age}
            chronoAge={aiDraft.chronological_age}
          />
        </View>

        <Text style={styles.narrative}>{buildPillarNarrative(aiDraft.scores)}</Text>

        {(gp || tcm) && (
          <View style={styles.section}>
            <CareTeamNotesCard gp={gp} tcm={tcm} />
          </View>
        )}

        <View style={styles.section}>
          <PillarStrip items={[...pillarItems]} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key contributors</Text>
          <View style={styles.contributorList}>
            {aiDraft.key_contributors.map((c) => (
              <KeyContributorItem key={c.text} text={c.text} tone={c.tone} />
            ))}
          </View>
        </View>

        {(topFocus || topDiscussionPoint) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your next steps</Text>
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
      </ScrollView>

      <Pressable
        onPress={askAva}
        accessibilityRole="button"
        accessibilityLabel="Ask Ava a follow-up question"
        style={styles.askAvaFab}
      >
        <MessageCircle size={18} color={colors.white} />
        <Text style={styles.askAvaFabText}>Ask Ava</Text>
      </Pressable>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 96 },
  title: {
    fontSize: fontSizes.headlineLg,
    fontWeight: "600",
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: 4,
  },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.charcoal,
    marginBottom: 12,
  },
  narrative: {
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    lineHeight: 22,
    marginTop: 16,
    textAlign: "center",
  },
  contributorList: { gap: 8 },
  expanded: { marginTop: 16 },
  nextStepsCard: { marginTop: 12 },
  askAvaFab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xl,
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
