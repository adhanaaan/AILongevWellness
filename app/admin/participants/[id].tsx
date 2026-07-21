import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { ArrowLeft, AlertTriangle } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusTimeline } from "@/components/admin/StatusTimeline";
import { BiomarkerRow } from "@/components/admin/BiomarkerRow";
import { AIDraftSummaryCard } from "@/components/admin/AIDraftSummaryCard";
import { SignOffStage } from "@/components/admin/SignOffStage";
import { ReleaseButton } from "@/components/admin/ReleaseButton";
import { DiscussionPointsCard } from "@/components/admin/DiscussionPointsCard";
import { PipelineStatusBadge } from "@/components/admin/PipelineStatusBadge";
import { Button, Card } from "@/components/ui";
import { repository } from "@/lib/data/mock";
import { resolveAttentionAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { generateDraft } from "@/lib/ai/client";
import type {
  Participant,
  Pipeline,
  Biomarker,
  AiDraft,
  Review,
  PipelineState,
  Pillar,
} from "@/lib/types/db";
import { colors, fontSizes, spacing, radii } from "@/lib/theme/tokens";

const PIPELINE_STAGES = [
  "Capturing",
  "AI Draft",
  "GP Review",
  "TCM Review",
  "Signed",
  "Delivered",
];

const STATE_INDEX: Record<PipelineState, number> = {
  capturing: 0,
  ai_drafted: 1,
  gp_review: 2,
  tcm_review: 3,
  signed: 4,
  delivered: 5,
};

const PILLAR_ORDER: Pillar[] = ["vascular", "metabolic", "mental"];

export default function ParticipantDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    const [p, pipe, bm, draft, rev] = await Promise.all([
      repository.getParticipant(id),
      repository.getPipeline(id),
      repository.getBiomarkers(id),
      repository.getAiDraft(id),
      repository.getReviews(id),
    ]);
    setParticipant(p);
    setPipeline(pipe);
    setBiomarkers(bm);
    setAiDraft(draft);
    setReviews(rev);
  };

  useEffect(() => {
    loadData();
    return repository.subscribe(loadData);
  }, [id]);

  const gpReview = reviews.find((r) => r.stage === "gp");
  const tcmReview = reviews.find((r) => r.stage === "tcm");

  async function onGenerateDraft() {
    if (!id || !session?.access_token) return;
    setGenerateError(null);
    setGenerating(true);
    try {
      await generateDraft(session.access_token, id);
      await loadData();
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Draft generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  const biomarkersByPillar = useMemo(() => {
    const grouped: Record<string, Biomarker[]> = {};
    for (const pillar of PILLAR_ORDER) {
      grouped[pillar] = biomarkers.filter((b) => b.pillar === pillar);
    }
    return grouped;
  }, [biomarkers]);

  if (!participant || !pipeline) return null;

  const stateIdx = STATE_INDEX[pipeline.state];
  const isEditable =
    pipeline.state === "gp_review" || pipeline.state === "tcm_review";

  return (
    <AdminShell title={participant.name}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />}
          onPress={() => router.back()}
        >
          Back
        </Button>

        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text style={styles.name}>{participant.name}</Text>
            <Text style={styles.meta}>
              {participant.age} · {participant.sex} · {participant.height_cm}cm ·{" "}
              {participant.weight_kg}kg
            </Text>
          </View>
          <PipelineStatusBadge state={pipeline.state} needsAttention={pipeline.needs_attention} />
        </View>

        {pipeline.needs_attention && (
          <Card style={styles.attentionCard}>
            <View style={styles.attentionRow}>
              <AlertTriangle size={18} color={colors.danger} />
              <View style={styles.attentionContent}>
                <Text style={styles.attentionTitle}>Needs attention</Text>
                <Text style={styles.attentionReason}>
                  {pipeline.attention_reason}
                </Text>
              </View>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => resolveAttentionAction(id!)}
              >
                Resolve
              </Button>
            </View>
          </Card>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pipeline</Text>
          <Card>
            <StatusTimeline stages={PIPELINE_STAGES} currentIndex={stateIdx} />
          </Card>
        </View>

        {aiDraft && (
          <>
            <View style={styles.section}>
              <AIDraftSummaryCard
                aiDraft={aiDraft}
                participantId={id!}
                editable={isEditable}
              />
            </View>

            {aiDraft.discussion_points.length > 0 && (
              <View style={styles.section}>
                <DiscussionPointsCard points={aiDraft.discussion_points} />
              </View>
            )}
          </>
        )}

        {!aiDraft && pipeline.state === "ai_drafted" && isSupabaseConfigured && (
          <View style={styles.section}>
            <Card>
              <Text style={styles.sectionTitle}>AI draft not generated yet</Text>
              <Text style={styles.meta}>
                Capture is complete, but the draft health card hasn't been generated —
                this usually happens automatically right after submission. Retry it below.
              </Text>
              {generateError && <Text style={styles.attentionReason}>{generateError}</Text>}
              <Button size="sm" disabled={generating} onPress={onGenerateDraft}>
                {generating ? "Generating…" : "Generate AI draft"}
              </Button>
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biomarkers</Text>
          {biomarkers.length === 0 ? (
            <Card>
              <Text style={styles.meta}>
                No biomarkers captured yet — none of this participant's capture channels
                have produced real values (e.g. no lab report uploaded).
              </Text>
            </Card>
          ) : (
            PILLAR_ORDER.map((pillar) => {
              const items = biomarkersByPillar[pillar] ?? [];
              if (items.length === 0) return null;
              return (
                <View key={pillar} style={styles.pillarGroup}>
                  <Text style={styles.pillarLabel}>
                    {pillar.charAt(0).toUpperCase() + pillar.slice(1)}
                  </Text>
                  <Card style={styles.biomarkerCard}>
                    {items.map((bm) => (
                      <BiomarkerRow
                        key={bm.id}
                        biomarker={bm}
                        participantId={id!}
                        trend="flat"
                        editable={isEditable}
                      />
                    ))}
                  </Card>
                </View>
              );
            })
          )}
        </View>

        {pipeline.state !== "capturing" && pipeline.state !== "ai_drafted" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sign-off</Text>
            <View style={styles.signOffStack}>
              <SignOffStage
                stage="gp"
                participantId={id!}
                review={gpReview}
                locked={false}
              />
              <SignOffStage
                stage="tcm"
                participantId={id!}
                review={tcmReview}
                locked={pipeline.state === "gp_review"}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <ReleaseButton
            participantId={id!}
            enabled={pipeline.state === "signed"}
          />
        </View>
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  titleLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    fontSize: fontSizes.headlineLg,
    fontWeight: "700",
    color: colors.charcoal,
  },
  meta: {
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  attentionCard: {
    backgroundColor: colors.dangerTint,
    borderColor: colors.danger,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  attentionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  attentionContent: {
    flex: 1,
  },
  attentionTitle: {
    fontSize: fontSizes.bodyMd,
    fontWeight: "600",
    color: colors.danger,
  },
  attentionReason: {
    fontSize: fontSizes.caption,
    color: colors.charcoal,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.bodyLg,
    fontWeight: "600",
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  pillarGroup: {
    marginBottom: spacing.md,
  },
  pillarLabel: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.sageDark,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  biomarkerCard: {
    padding: 0,
    overflow: "hidden",
  },
  signOffStack: {
    gap: spacing.md,
  },
});
