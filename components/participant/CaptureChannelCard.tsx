"use client";

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { CaptureChannelStatus, EnteredBy } from "@/lib/types/db";

export interface CaptureChannelCardProps {
  icon: ReactNode;
  title: string;
  description?: string;
  sourceTag: string;
  enteredBy: EnteredBy | null;
  status: CaptureChannelStatus;
  actionLabel: string;
  onAction: () => void;
  /** ReCOGnAIze gets the sage-tint "AI Tech" treatment per COMPONENTS.md. */
  highlight?: boolean;
}

const STATUS_LABEL: Record<CaptureChannelStatus, string> = {
  empty: "Not started",
  partial: "In progress",
  complete: "Complete",
};

export function CaptureChannelCard({
  icon,
  title,
  description,
  sourceTag,
  enteredBy,
  status,
  actionLabel,
  onAction,
  highlight,
}: CaptureChannelCardProps) {
  return (
    <Card tinted={highlight} className="flex items-start gap-4">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          highlight ? "bg-sage text-white" : "bg-sage-tint text-sage-dark"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-label-md text-charcoal">{title}</h3>
          {status === "complete" && <CheckCircle2 size={18} className="text-sage shrink-0" />}
        </div>
        {description && <p className="mt-0.5 text-caption text-ink-muted">{description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 font-semibold">{sourceTag}</span>
          {enteredBy && <span>Entered by {enteredBy === "participant" ? "you" : "care team"}</span>}
          <span>· {STATUS_LABEL[status]}</span>
        </div>
        <Button
          variant={status === "complete" ? "secondary" : "primary"}
          size="sm"
          shape="md"
          className="mt-3"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
}
