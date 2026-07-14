import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { repository } from "@/lib/data/mock";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { PipelineStatusBadge } from "@/components/admin/PipelineStatusBadge";
import { StatusTimeline } from "@/components/admin/StatusTimeline";
import { BiomarkerRow } from "@/components/admin/BiomarkerRow";
import { AIDraftSummaryCard } from "@/components/admin/AIDraftSummaryCard";
import { SignOffStage } from "@/components/admin/SignOffStage";
import { ReleaseButton } from "@/components/admin/ReleaseButton";
import { DiscussionPointsCard } from "@/components/admin/DiscussionPointsCard";
import { ScoreRing } from "@/components/participant/ScoreRing";
import type { Pillar, PipelineState } from "@/lib/types/db";

export const dynamic = "force-dynamic";

const TIMELINE_STAGES = ["AI drafted", "GP signed", "TCM signed", "Released"];
const STAGE_INDEX: Record<PipelineState, number> = {
  capturing: 0,
  ai_drafted: 1,
  gp_review: 1,
  tcm_review: 2,
  signed: 3,
  delivered: 4,
};
const PILLARS: Pillar[] = ["vascular", "metabolic", "mental"];
const PILLAR_LABEL: Record<Pillar, string> = { vascular: "Vascular", metabolic: "Metabolic", mental: "Mental" };

export default async function ParticipantDetailPage({ params }: { params: { id: string } }) {
  const participant = await repository.getParticipant(params.id);
  if (!participant) notFound();

  const [pipeline, biomarkers, aiDraft, reviews] = await Promise.all([
    repository.getPipeline(params.id),
    repository.getBiomarkers(params.id),
    repository.getAiDraft(params.id),
    repository.getReviews(params.id),
  ]);
  if (!pipeline) notFound();

  const gpReview = reviews.find((r) => r.stage === "gp");
  const tcmReview = reviews.find((r) => r.stage === "tcm");
  const gpLocked = pipeline.state === "capturing";
  const tcmLocked = pipeline.state === "capturing" || pipeline.state === "ai_drafted" || pipeline.state === "gp_review";

  return (
    <AdminShell title={participant.name}>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-headline-md text-charcoal">{participant.name}</p>
              <p className="text-caption text-ink-muted">
                {participant.age} · {participant.sex} · {participant.height_cm}cm · {participant.weight_kg}kg
              </p>
            </div>
            <PipelineStatusBadge state={pipeline.state} needsAttention={pipeline.needs_attention} />
          </Card>

          {pipeline.needs_attention && pipeline.attention_reason && (
            <Card className="border-danger bg-danger-tint text-danger">{pipeline.attention_reason}</Card>
          )}

          <Card>
            <StatusTimeline stages={TIMELINE_STAGES} currentIndex={STAGE_INDEX[pipeline.state]} />
          </Card>

          {aiDraft ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                {PILLARS.map((pillar) => (
                  <Card key={pillar} className="flex flex-col items-center">
                    <ScoreRing
                      value={aiDraft.scores[pillar]}
                      label={PILLAR_LABEL[pillar]}
                      status={aiDraft.scores[pillar] >= 70 ? "good" : "monitor"}
                      size={72}
                    />
                  </Card>
                ))}
              </div>

              <Card padding="none" className="overflow-hidden">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-headline-md text-charcoal">Biomarkers</h3>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-surface-muted text-caption text-ink-muted">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Metric</th>
                      <th className="px-4 py-2 font-semibold">Value</th>
                      <th className="px-4 py-2 font-semibold">Reference range</th>
                      <th className="px-4 py-2 font-semibold">Source</th>
                      <th className="px-4 py-2 font-semibold">Trend</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {biomarkers.map((b) => (
                      <BiomarkerRow key={b.id} biomarker={b} participantId={participant.id} />
                    ))}
                  </tbody>
                </table>
              </Card>

              <AIDraftSummaryCard aiDraft={aiDraft} participantId={participant.id} />
              <DiscussionPointsCard points={aiDraft.discussion_points} />
            </>
          ) : (
            <Card className="text-center text-body-md text-ink-muted">
              This participant hasn&apos;t finished capture yet — the AI draft will appear here once capture is
              submitted.
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-label-md text-charcoal">Verification hub</h3>
          <SignOffStage stage="gp" participantId={participant.id} review={gpReview} locked={gpLocked} />
          <SignOffStage stage="tcm" participantId={participant.id} review={tcmReview} locked={tcmLocked} />

          {pipeline.state === "delivered" ? (
            <Card className="flex items-center gap-2 bg-sage-tint text-sage-dark">
              <CheckCircle2 size={18} />
              <span className="text-label-md">
                Delivered {pipeline.delivered_at ? new Date(pipeline.delivered_at).toLocaleString() : ""}
              </span>
            </Card>
          ) : (
            <ReleaseButton participantId={participant.id} enabled={pipeline.state === "signed"} />
          )}
        </div>
      </div>
    </AdminShell>
  );
}
