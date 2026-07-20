import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Clock } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { BiologicalAgeHero } from "@/components/participant/BiologicalAgeHero";
import { ScoreRing } from "@/components/participant/ScoreRing";
import { KeyContributorItem } from "@/components/participant/KeyContributorItem";
import { SuggestedFocusGrid } from "@/components/participant/SuggestedFocusGrid";
import { CareTeamBadge } from "@/components/participant/CareTeamBadge";
import { Button } from "@/components/ui/Button";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { SignedCard } from "@/lib/data/repository";
import { colors, fontSizes } from "@/lib/theme/tokens";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();
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
        <Text style={styles.title}>Your executive wellness snapshot</Text>
        <Text style={styles.subtitle}>
          Reviewed and signed off by your care team.
        </Text>

        <View style={styles.section}>
          <BiologicalAgeHero
            bioAge={aiDraft.biological_age}
            chronoAge={aiDraft.chronological_age}
          />
        </View>

        <View style={styles.rings}>
          <ScoreRing
            value={aiDraft.scores.vascular}
            label="Vascular"
            status={aiDraft.scores.vascular >= 70 ? "good" : "monitor"}
          />
          <ScoreRing
            value={aiDraft.scores.metabolic}
            label="Metabolic"
            status={aiDraft.scores.metabolic >= 70 ? "good" : "monitor"}
          />
          <ScoreRing
            value={aiDraft.scores.mental}
            label="Mental"
            status={aiDraft.scores.mental >= 70 ? "good" : "monitor"}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key contributors</Text>
          <View style={styles.contributorList}>
            {aiDraft.key_contributors.map((c) => (
              <KeyContributorItem key={c.text} text={c.text} tone={c.tone} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested focus</Text>
          <SuggestedFocusGrid items={aiDraft.suggested_focus} />
        </View>

        {gp && tcm && (
          <View style={styles.section}>
            <CareTeamBadge
              gpInitials={initialsOf(gp.reviewer_name)}
              tcmInitials={initialsOf(tcm.reviewer_name)}
            />
          </View>
        )}

        <View style={styles.section}>
          <Button
            size="lg"
            onPress={() => router.push("/(tabs)/ava")}
          >
            Ask about my results
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
  contributorList: { gap: 8 },
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
