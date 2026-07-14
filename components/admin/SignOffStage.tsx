"use client";

import { useState, useTransition } from "react";
import { Lock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { signOffAction } from "@/lib/data/actions";
import type { Review, ReviewStage } from "@/lib/types/db";

const STAGE_LABEL: Record<ReviewStage, string> = { gp: "GP", tcm: "TCM" };
const DEFAULT_CREDENTIAL: Record<ReviewStage, string> = {
  gp: "MBBS, General Practice",
  tcm: "TCM Practitioner, Licensed",
};

export function SignOffStage({
  stage,
  participantId,
  review,
  locked,
}: {
  stage: ReviewStage;
  participantId: string;
  review?: Review;
  locked: boolean;
}) {
  const [reviewerName, setReviewerName] = useState(review?.reviewer_name ?? "");
  const [credential, setCredential] = useState(review?.reviewer_credential ?? DEFAULT_CREDENTIAL[stage]);
  const [notes, setNotes] = useState(review?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const signed = Boolean(review?.signed_at);

  if (locked) {
    return (
      <Card className="flex items-center gap-3 opacity-60">
        <Lock size={18} className="text-ink-muted" />
        <div>
          <p className="text-label-md text-charcoal">Stage {stage === "gp" ? 1 : 2}: {STAGE_LABEL[stage]} review</p>
          <p className="text-caption text-ink-muted">
            {stage === "tcm" ? "Locked until GP sign-off is complete." : "Locked."}
          </p>
        </div>
      </Card>
    );
  }

  if (signed && review) {
    return (
      <Card className="flex items-start gap-3 bg-sage-tint">
        <CheckCircle2 size={20} className="text-sage-dark shrink-0 mt-0.5" />
        <div>
          <p className="text-label-md text-sage-dark">
            Stage {stage === "gp" ? 1 : 2}: {STAGE_LABEL[stage]} signed
          </p>
          <p className="mt-1 text-body-md text-charcoal">
            {review.reviewer_name} · {review.reviewer_credential}
          </p>
          {review.notes && <p className="mt-1 text-caption text-ink-muted">&ldquo;{review.notes}&rdquo;</p>}
          <p className="mt-1 text-caption text-ink-muted">
            Signed {review.signed_at ? new Date(review.signed_at).toLocaleString() : ""}
          </p>
        </div>
      </Card>
    );
  }

  function submit() {
    if (!reviewerName.trim() || !credential.trim()) {
      setError("Reviewer name and credential are required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await signOffAction(participantId, stage, {
        reviewer_name: reviewerName.trim(),
        reviewer_credential: credential.trim(),
        notes: notes.trim(),
      });
    });
  }

  return (
    <Card>
      <p className="text-label-md text-charcoal">
        Stage {stage === "gp" ? 1 : 2}: {STAGE_LABEL[stage]} review
      </p>
      <div className="mt-3 space-y-3">
        <Input label="Reviewer name" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="Dr. Jane Doe" />
        <Input label="Credential" value={credential} onChange={(e) => setCredential(e.target.value)} />
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Review notes (optional)" />
        {error && <p className="text-caption text-danger">{error}</p>}
        <Button className="w-full" disabled={isPending} onClick={submit}>
          Sign off ({STAGE_LABEL[stage]})
        </Button>
      </div>
    </Card>
  );
}
