import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Clock } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { BiologicalAgeHero } from "@/components/participant/BiologicalAgeHero";
import { ScoreRing } from "@/components/participant/ScoreRing";
import { KeyContributorItem } from "@/components/participant/KeyContributorItem";
import { SuggestedFocusGrid } from "@/components/participant/SuggestedFocusGrid";
import { CareTeamNotesCard } from "@/components/participant/CareTeamNotesCard";
import { NextStepsCard } from "@/components/participant/NextStepsCard";
import { Button } from "@/components/ui/Button";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { pillarStatus } from "@/lib/ai/scoring";
import type { SignedCard } from "@/lib/data/repository";
import { colors, fontSizes } from "@/lib/theme/tokens";

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

  useEffect(() => {
    if (!participantId) return;
    repository.getSignedCard(participantId).then(setCard);
    return repository.subscribe(() => {
      repository.getSignedCard(participantId).then(setCard);
    });
  }, [participantId]);

  if (card === undefined) return null;

  if (!card) {
    return (
      <MobileShell>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Clock size={24} color={colors.sageDark} />
          </View>
          <Text style={styles.emptyTitle}>
            Your snapshot is being prepared
          </Text>
          <Text style={styles.emptyText}>
            Your care team is reviewing your results. We'll let you know as soon
            as your health card is ready.
          </Text>
        </View>
      </MobileShell>
    );
  }

  const { aiDraft, reviews } = card;
  const gp = reviews.find((r) => r.stage === "gp");
  const tcm = reviews.find((r) => r.stage === "tcm");

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

        <View style={styles.rings}>
          <Pressable
            onPress={() => router.push("/pillar/vascular")}
            accessibilityRole="button"
            accessibilityLabel="View details for Vascular score"
          >
            <ScoreRing
              value={aiDraft.scores.vascular}
              label="Vascular"
              status={pillarStatus(aiDraft.scores.vascular)}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push("/pillar/metabolic")}
            accessibilityRole="button"
            accessibilityLabel="View details for Metabolic score"
          >
            <ScoreRing
              value={aiDraft.scores.metabolic}
              label="Metabolic"
              status={pillarStatus(aiDraft.scores.metabolic)}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push("/pillar/mental")}
            accessibilityRole="button"
            accessibilityLabel="View details for Mental score"
          >
            <ScoreRing
              value={aiDraft.scores.mental}
              label="Mental"
              status={pillarStatus(aiDraft.scores.mental)}
            />
          </Pressable>
        </View>
        <Text style={styles.ringsCaption}>
          Tap a score to see what's driving it
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key contributors</Text>
          <View style={styles.contributorList}>
            {aiDraft.key_contributors.map((c) => (
              <KeyContributorItem key={c.text} text={c.text} tone={c.tone} />
            ))}
          </View>
        </View>

        {(gp || tcm) && (
          <View style={styles.section}>
            <CareTeamNotesCard gp={gp} tcm={tcm} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your next steps</Text>
          <SuggestedFocusGrid items={aiDraft.suggested_focus} />
          <View style={styles.nextStepsCard}>
            <NextStepsCard points={aiDraft.discussion_points} />
          </View>
        </View>

        <View style={styles.section}>
          <Button
            size="lg"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/ava",
                params: {
                  q: "Can you walk me through what's driving my scores?",
                },
              })
            }
          >
            Ask Ava a follow-up
          </Button>
        </View>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },
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
  rings: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 24,
  },
  ringsCaption: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 8,
  },
  contributorList: { gap: 8 },
  nextStepsCard: { marginTop: 12 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
    marginTop: 16,
    textAlign: "center",
  },
  emptyText: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 280,
  },
});
