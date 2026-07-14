"use client";

import { useState, useTransition } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";
import { updateBiomarkerAction } from "@/lib/data/actions";
import type { Biomarker } from "@/lib/types/db";

const SOURCE_LABEL: Record<Biomarker["source"], string> = {
  manual: "Manual",
  wearable: "Wearable",
  lab_extract: "Lab",
  body_comp: "Body comp",
  recognize: "ReCOGnAIze",
  admin: "Admin",
};

export type Trend = "up" | "down" | "flat";

export interface BiomarkerRowProps {
  biomarker: Biomarker;
  participantId: string;
  trend?: Trend;
  editable?: boolean;
}

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export function BiomarkerRow({ biomarker, participantId, trend = "flat", editable = true }: BiomarkerRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(biomarker.value?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const TrendIcon = TREND_ICON[trend];

  const missing = biomarker.value === null;
  const hasRange = biomarker.ref_low !== null && biomarker.ref_high !== null;

  function save() {
    const parsed = value.trim() === "" ? null : Number(value);
    startTransition(async () => {
      const flagged =
        parsed !== null && hasRange ? parsed < biomarker.ref_low! || parsed > biomarker.ref_high! : biomarker.flagged;
      await updateBiomarkerAction(participantId, biomarker.id, { value: parsed, flagged });
      setEditing(false);
    });
  }

  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3 text-body-md text-charcoal">{biomarker.label}</td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-24"
              type="number"
              step="any"
            />
            <span className="text-caption text-ink-muted">{biomarker.unit}</span>
          </div>
        ) : missing ? (
          <span className="text-caption italic text-ink-muted">needs data</span>
        ) : (
          <span className={cn("text-body-md font-semibold", biomarker.flagged ? "text-terracotta-ink" : "text-charcoal")}>
            {biomarker.value} {biomarker.unit}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-caption text-ink-muted">
        {hasRange ? `${biomarker.ref_low}–${biomarker.ref_high} ${biomarker.unit}` : "—"}
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption font-semibold text-ink-muted">
          {SOURCE_LABEL[biomarker.source]}
        </span>
      </td>
      <td className="px-4 py-3 text-ink-muted">
        <TrendIcon size={16} />
      </td>
      {editable && (
        <td className="px-4 py-3 text-right">
          {editing ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" shape="md" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" shape="md" disabled={isPending} onClick={save}>
                Save
              </Button>
            </div>
          ) : (
            <Button size="sm" shape="md" variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </td>
      )}
    </tr>
  );
}
