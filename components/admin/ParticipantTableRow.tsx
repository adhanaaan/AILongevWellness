"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { PipelineStatusBadge } from "@/components/admin/PipelineStatusBadge";
import { CaptureCompletionBar } from "@/components/admin/CaptureCompletionBar";
import { Button } from "@/components/ui/Button";
import { resolveAttentionAction } from "@/lib/data/actions";
import { cn } from "@/lib/utils/cn";
import type { ParticipantSummary } from "@/lib/types/db";

export function ParticipantTableRow({ summary }: { summary: ParticipantSummary }) {
  const { participant, pipeline, captureCompletionPct } = summary;
  const [isPending, startTransition] = useTransition();

  return (
    <tr
      className={cn(
        "group border-b border-border transition-colors hover:bg-sage-tint/40",
        pipeline.needs_attention && "bg-danger-tint/40"
      )}
    >
      <td className="px-4 py-3">
        <Link href={`/admin/participants/${participant.id}`} className="block">
          <p className="text-label-md text-charcoal group-hover:underline">{participant.name}</p>
          <p className="text-caption text-ink-muted">
            {participant.age} · {participant.sex}
          </p>
        </Link>
      </td>
      <td className="px-4 py-3">
        <CaptureCompletionBar value={captureCompletionPct} />
      </td>
      <td className="px-4 py-3">
        <PipelineStatusBadge state={pipeline.state} needsAttention={pipeline.needs_attention} />
        {pipeline.needs_attention && pipeline.attention_reason && (
          <p className="mt-1 text-caption text-danger">{pipeline.attention_reason}</p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {pipeline.needs_attention && (
            <Button
              variant="secondary"
              size="sm"
              shape="md"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await resolveAttentionAction(participant.id);
                })
              }
            >
              Resolve
            </Button>
          )}
          <Link
            href={`/admin/participants/${participant.id}`}
            className="inline-flex items-center gap-1 text-label-md text-sage-dark"
          >
            View <ChevronRight size={16} />
          </Link>
        </div>
      </td>
    </tr>
  );
}
