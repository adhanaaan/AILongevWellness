"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { updateAiDraftAction } from "@/lib/data/actions";
import type { AiDraft } from "@/lib/types/db";

function toLines(items: string[]) {
  return items.join("\n");
}
function fromLines(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function AIDraftSummaryCard({
  aiDraft,
  participantId,
  editable = true,
}: {
  aiDraft: AiDraft;
  participantId: string;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [strengths, setStrengths] = useState(toLines(aiDraft.strengths));
  const [areas, setAreas] = useState(toLines(aiDraft.areas_to_monitor));
  const [focus, setFocus] = useState(toLines(aiDraft.suggested_focus));
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateAiDraftAction(participantId, {
        strengths: fromLines(strengths),
        areas_to_monitor: fromLines(areas),
        suggested_focus: fromLines(focus),
      });
      setEditing(false);
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-headline-md text-charcoal">AI-drafted summary</h3>
        <div className="flex items-center gap-2">
          {aiDraft.edited_by_admin && (
            <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption font-semibold text-ink-muted">
              Edited
            </span>
          )}
          {editable && !editing && (
            <Button size="sm" shape="md" variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-4">
          <Textarea label="Strengths (one per line)" rows={3} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
          <Textarea label="Areas to monitor (one per line)" rows={3} value={areas} onChange={(e) => setAreas(e.target.value)} />
          <Textarea label="Suggested focus (one per line)" rows={3} value={focus} onChange={(e) => setFocus(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button disabled={isPending} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Section title="Strengths" items={aiDraft.strengths} />
          <Section title="Areas to monitor" items={aiDraft.areas_to_monitor} tone="monitor" />
          <Section title="Suggested focus" items={aiDraft.suggested_focus} />
        </div>
      )}
    </Card>
  );
}

function Section({ title, items, tone }: { title: string; items: string[]; tone?: "monitor" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-label-md text-ink-muted">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className={tone === "monitor" ? "text-terracotta-ink" : "text-charcoal"}>
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
