"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileEdit, Watch, PersonStanding, FileText, Brain } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { PillarTabs } from "@/components/participant/PillarTabs";
import { CaptureChannelCard } from "@/components/participant/CaptureChannelCard";
import { updateCaptureChannelAction, submitCaptureAction } from "@/lib/data/actions";
import { DEMO_PARTICIPANT_ID } from "@/lib/data/mock";
import type { CaptureChannel, CaptureChannelName, Pillar } from "@/lib/types/db";

const CHANNEL_META: Record<
  CaptureChannelName,
  { title: string; description: string; sourceTag: string; icon: React.ReactNode; completeLabel: string; incompleteLabel: string; highlight?: boolean }
> = {
  manual: {
    title: "Manual & questionnaire",
    description: "Self-reported history and lifestyle questions.",
    sourceTag: "Manual",
    icon: <FileEdit size={20} />,
    completeLabel: "Edit answers",
    incompleteLabel: "Start questionnaire",
  },
  wearables: {
    title: "Wearables",
    description: "Connect your device for heart rate, sleep and activity.",
    sourceTag: "Wearable",
    icon: <Watch size={20} />,
    completeLabel: "Manage connection",
    incompleteLabel: "Connect",
  },
  body_composition: {
    title: "Body composition scan",
    description: "Upload a scan or enter values from the retreat kiosk.",
    sourceTag: "Body comp",
    icon: <PersonStanding size={20} />,
    completeLabel: "View values",
    incompleteLabel: "Enter values",
  },
  lab_report: {
    title: "Screening / lab reports",
    description: "Upload a PDF or photo — we'll extract the values for you.",
    sourceTag: "Lab",
    icon: <FileText size={20} />,
    completeLabel: "View report",
    incompleteLabel: "Upload PDF or photo",
  },
  recognize: {
    title: "ReCOGnAIze",
    description: "A short cognitive assessment for your mental pillar.",
    sourceTag: "AI Tech",
    icon: <Brain size={20} />,
    completeLabel: "View results",
    incompleteLabel: "Start assessment",
    highlight: true,
  },
};

export function CaptureView({ channels }: { channels: CaptureChannel[] }) {
  const router = useRouter();
  const [pillar, setPillar] = useState<Pillar>("vascular");
  const [localChannels, setLocalChannels] = useState(channels);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const completion =
    localChannels.reduce((sum, c) => sum + (c.status === "complete" ? 1 : c.status === "partial" ? 0.5 : 0), 0) /
    localChannels.length;
  const allComplete = localChannels.every((c) => c.status === "complete");

  function completeChannel(channel: CaptureChannelName) {
    startTransition(async () => {
      const updated = await updateCaptureChannelAction(DEMO_PARTICIPANT_ID, channel, {
        status: "complete",
        entered_by: "participant",
      });
      setLocalChannels((prev) => prev.map((c) => (c.channel === channel ? updated : c)));
    });
  }

  function submit() {
    setSubmitError(null);
    startTransition(async () => {
      try {
        await submitCaptureAction(DEMO_PARTICIPANT_ID);
        router.push("/card");
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex min-h-[80vh] flex-col">
      <h1 className="text-headline-lg text-charcoal">Data capture</h1>
      <p className="mt-1 text-body-md text-ink-muted">Complete each channel to build your snapshot.</p>

      <div className="mt-4">
        <ProgressBar value={Math.round(completion * 100)} />
        <p className="mt-1 text-caption text-ink-muted">{Math.round(completion * 100)}% complete</p>
      </div>

      <div className="mt-5">
        <PillarTabs active={pillar} onChange={setPillar} />
      </div>

      <div className="mt-5 space-y-3">
        {localChannels.map((c) => {
          const meta = CHANNEL_META[c.channel];
          return (
            <CaptureChannelCard
              key={c.channel}
              icon={meta.icon}
              title={meta.title}
              description={meta.description}
              sourceTag={meta.sourceTag}
              enteredBy={c.entered_by}
              status={c.status}
              actionLabel={c.status === "complete" ? meta.completeLabel : meta.incompleteLabel}
              onAction={() => {
                if (c.status !== "complete") completeChannel(c.channel);
              }}
              highlight={meta.highlight}
            />
          );
        })}
      </div>

      <p className="mt-4 text-caption text-ink-muted">
        Wearable data syncs automatically once connected — no need to re-enter it here.
      </p>

      <div className="mt-auto pt-8">
        {submitError && <p className="mb-2 text-caption text-danger">{submitError}</p>}
        <Button className="w-full" size="lg" disabled={!allComplete || isPending} onClick={submit}>
          Review my snapshot
        </Button>
      </div>
    </div>
  );
}
