import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import type { PipelineState } from "@/lib/types/db";

export interface PipelineStatusBadgeProps {
  state: PipelineState;
  needsAttention?: boolean;
}

const STATE_TO_STATUS: Record<PipelineState, Status> = {
  capturing: "capturing",
  ai_drafted: "ai_drafted",
  gp_review: "gp_review",
  tcm_review: "tcm_review",
  signed: "signed",
  delivered: "delivered",
};

export function PipelineStatusBadge({ state, needsAttention }: PipelineStatusBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={STATE_TO_STATUS[state]} />
      {needsAttention && <StatusBadge status="needs-attention" />}
    </div>
  );
}
