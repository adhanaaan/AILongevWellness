import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { ArrowLeft, ArrowRight, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusTimeline } from "@/components/admin/StatusTimeline";
import { BiomarkerRow } from "@/components/admin/BiomarkerRow";
import { AIDraftSummaryCard } from "@/components/admin/AIDraftSummaryCard";
import { CarePlanEditor } from "@/components/admin/CarePlanEditor";
import { SignOffStage } from "@/components/admin/SignOffStage";
import { ReleaseButton } from "@/components/admin/ReleaseButton";
import { DiscussionPointsCard } from "@/components/admin/DiscussionPointsCard";
import { PipelineStatusBadge } from "@/components/admin/PipelineStatusBadge";
import { PhenoAgeStatusCard } from "@/components/admin/PhenoAgeStatusCard";
import { Button, Card } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import { repository } from "@/lib/data/mock";
import { resolveAttentionAction, getFileUrlAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { generateDraft, extractLabReport, extractWearableExport, extractBodyComp } from "@/lib/ai/client";
import type {
  Participant,
  Pipeline,
  Biomarker,
  AiDraft,
  Review,
  PipelineState,
  Pillar,
  FileRecord,
  DailyLog,
  ParticipantSummary,
} from "@/lib/types/db";
import { colors, fontSizes, spacing, radii } from "@/lib/theme/tokens";

// GP and TCM sign off independently, in either order -- collapsed into one
// "Review" step rather than two sequential ones, since the pipeline no
// longer implies GP must finish before TCM can start (or vice versa). Which
// specific stage(s) are done is shown by the two SignOffStage cards below,
// not by this high-level progress strip.
const PIPELINE_STAGES = ["Capturing", "AI Draft", "Review", "Signed", "Delivered"];

const STATE_INDEX: Record<PipelineState, number> = {
  capturing: 0,
  ai_drafted: 1,
  gp_review: 2,
  tcm_review: 2,
  signed: 3,
  delivered: 4,
};

const PILLAR_ORDER: Pillar[] = ["vascular", "metabolic", "mental"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ParticipantDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [queueSummaries, setQueueSummaries] = useState<ParticipantSummary[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [extractingFileId, setExtractingFileId] = useState<string | null>(null);
  const [extractErrors, setExtractErrors] = useState<Record<string, string>>({});
  const [resolvingAttention, setResolvingAttention] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    const [p, pipe, bm, draft, rev, f, logs, queue] = await Promise.all([
      repository.getParticipant(id),
      repository.getPipeline(id),
      repository.getBiomarkers(id),
      repository.getAiDraft(id),
      repository.getReviews(id),
      repository.listFiles(id),
      repository.listDailyLogs(id),
      repository.listParticipants(),
    ]);
    setParticipant(p);
    setPipeline(pipe);
    setBiomarkers(bm);
    setAiDraft(draft);
    setReviews(rev);
    setFiles(f);
    setDailyLogs(logs);
    setQueueSummaries(queue);
  };

  async function onExtractFile(file: FileRecord) {
    if (!id || !session?.access_token) return;
    setExtractErrors((prev) => ({ ...prev, [file.id]: "" }));
    setExtractingFileId(file.id);
    try {
      if (file.kind === "lab_report") {
        await extractLabReport(session.access_token, id, file.id);
      } else if (file.kind === "apple_health_export") {
        await extractWearableExport(session.access_token, id, file.id);
      } else if (file.kind === "body_comp") {
        await extractBodyComp(session.access_token, id, file.id);
      }
      await loadData();
    } catch (e) {
      setExtractErrors((prev) => ({
        ...prev,
        [file.id]: e instanceof Error ? e.message : "Extraction failed.",
      }));
    } finally {
      setExtractingFileId(null);
    }
  }

  async function onViewFile(file: FileRecord) {
    const url = await getFileUrlAction(file.id);
    if (url) Linking.openURL(url);
  }

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

  async function onResolveAttention() {
    if (!id) return;
    setResolveError(null);
    setResolvingAttention(true);
    try {
      await resolveAttentionAction(id);
    } catch (e) {
      setResolveError(e instanceof Error ? e.message : "Couldn't resolve — please try again.");
    } finally {
      setResolvingAttention(false);
    }
  }

  // The next participant still awaiting GP/TCM review, so a reviewer working
  // through the whole cohort can move on without going back to the queue and
  // re-finding their place after every sign-off.
  const nextInQueue = useMemo(() => {
    return (
      queueSummaries.find((s) => s.participant.id !== id && s.pipeline.state === "gp_review") ?? null
    );
  }, [queueSummaries, id]);

  const biomarkersByPillar = useMemo(() => {
    const grouped: Record<string, Biomarker[]> = {};
    for (const pillar of PILLAR_ORDER) {
      grouped[pillar] = biomarkers.filter((b) => b.pillar === pillar);
    }
    return grouped;
  }, [biomarkers]);

  if (!participant || !pipeline) {
    return (
      <AdminShell title="Participant">
        <LoadingState />
      </AdminShell>
    );
  }

  const stateIdx = STATE_INDEX[pipeline.state];
  const isEditable = pipeline.state === "gp_review";
  const isDraftSparse =
    !!aiDraft &&
    aiDraft.strengths.length === 0 &&
    aiDraft.areas_to_monitor.length === 0 &&
    aiDraft.suggested_focus.length === 0;

  return (
    <AdminShell
      title={participant.name}
      headerActions={
        nextInQueue ? (
          <Button
            variant="secondary"
            size="sm"
            iconRight={<ArrowRight size={16} color={colors.teal} />}
            onPress={() => router.push(`/admin/participants/${nextInQueue.participant.id}`)}
          >
            {`Next: ${nextInQueue.participant.name}`}
          </Button>
        ) : undefined
      }
    >
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
            <View style={styles.consentRow}>
              {participant.consent_given ? (
                <>
                  <ShieldCheck size={14} color={colors.sage} />
                  <Text style={styles.consentTextOk}>
                    Consent given{participant.consented_at ? ` ${formatDate(participant.consented_at)}` : ""}
                  </Text>
                </>
              ) : (
                <>
                  <ShieldAlert size={14} color={colors.danger} />
                  <Text style={styles.consentTextMissing}>Consent not recorded</Text>
                </>
              )}
            </View>
          </View>
          <PipelineStatusBadge
            state={pipeline.state}
            needsAttention={pipeline.needs_attention}
            gpSigned={!!gpReview}
            tcmSigned={!!tcmReview}
          />
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
                {resolveError && <Text style={styles.attentionReason}>{resolveError}</Text>}
              </View>
              <Button
                variant="secondary"
                size="sm"
                disabled={resolvingAttention}
                onPress={onResolveAttention}
              >
                {resolvingAttention ? "Resolving..." : "Resolve"}
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

            <View style={styles.section}>
              <CarePlanEditor
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

        {aiDraft && isDraftSparse && isEditable && isSupabaseConfigured && (
          <View style={styles.section}>
            <Card>
              <Text style={styles.sectionTitle}>This draft looks thin</Text>
              <Text style={styles.meta}>
                The draft was likely generated before all captured data had finished
                processing (e.g. a wearable export that was still being extracted).
                Now that more biomarkers are on file, you can regenerate it.
              </Text>
              {generateError && <Text style={styles.attentionReason}>{generateError}</Text>}
              <Button size="sm" disabled={generating} onPress={onGenerateDraft}>
                {generating ? "Regenerating…" : "Regenerate AI draft"}
              </Button>
            </Card>
          </View>
        )}

        {files.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uploaded files</Text>
            <Card>
              {files.map((file, i) => {
                const label =
                  file.kind === "lab_report"
                    ? "Lab report"
                    : file.kind === "apple_health_export"
                    ? "Apple Health export"
                    : "Body composition scan";
                const canExtract =
                  file.kind === "lab_report" ||
                  file.kind === "apple_health_export" ||
                  file.kind === "body_comp";
                const error = extractErrors[file.id];
                return (
                  <View key={file.id} style={i > 0 ? styles.fileRow : undefined}>
                    <View style={styles.fileRowContent}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fileLabel}>{label}</Text>
                        <Text style={styles.meta}>
                          {file.extracted ? "Extracted" : "Not yet extracted"}
                        </Text>
                        {!!error && <Text style={styles.attentionReason}>{error}</Text>}
                      </View>
                      {isSupabaseConfigured && (
                        <Button variant="ghost" size="sm" onPress={() => onViewFile(file)}>
                          View file
                        </Button>
                      )}
                      {canExtract && isSupabaseConfigured && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={extractingFileId === file.id}
                          onPress={() => onExtractFile(file)}
                        >
                          {extractingFileId === file.id
                            ? "Extracting…"
                            : file.extracted
                            ? "Re-extract"
                            : "Extract now"}
                        </Button>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {biomarkers.length > 0 && (
          <View style={styles.section}>
            <PhenoAgeStatusCard biomarkers={biomarkers} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biomarkers</Text>
          {biomarkers.length === 0 ? (
            <Card>
              <Text style={styles.meta}>
                No biomarkers captured yet — none of this participant's capture channels
                have produced real values (e.g. no lab report or Apple Health export uploaded).
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily tracking</Text>
          {dailyLogs.length === 0 ? (
            <Card>
              <Text style={styles.meta}>No daily check-ins logged yet.</Text>
            </Card>
          ) : (
            <Card>
              {[...dailyLogs]
                .sort((a, b) => (a.log_date < b.log_date ? 1 : -1))
                .slice(0, 7)
                .map((log, i) => {
                  const parts: string[] = [];
                  if (log.sleep) parts.push(`Sleep ${log.sleep.hours}h (${log.sleep.quality}/100)`);
                  if (log.activity) parts.push(`${log.activity.type} ${log.activity.duration_minutes}min`);
                  if (log.mood) parts.push(`Mood ${log.mood.score}/10`);
                  if (log.weight_kg != null) parts.push(`${log.weight_kg}kg`);
                  return (
                    <View key={log.log_date} style={i > 0 ? styles.fileRow : undefined}>
                      <Text style={styles.fileLabel}>{formatDate(log.log_date)}</Text>
                      <Text style={styles.meta}>
                        {parts.length > 0 ? parts.join(" · ") : "No metrics logged"}
                      </Text>
                      {log.supplements.length > 0 && (
                        <Text style={styles.meta}>Supplements: {log.supplements.join(", ")}</Text>
                      )}
                      {log.notes && <Text style={styles.meta}>{log.notes}</Text>}
                    </View>
                  );
                })}
            </Card>
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
                locked={false}
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
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  consentTextOk: {
    fontSize: fontSizes.caption,
    color: colors.sageDark,
  },
  consentTextMissing: {
    fontSize: fontSizes.caption,
    color: colors.danger,
    fontWeight: "600",
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
  fileRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  fileRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  fileLabel: {
    fontSize: fontSizes.bodyMd,
    fontWeight: "600",
    color: colors.charcoal,
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
