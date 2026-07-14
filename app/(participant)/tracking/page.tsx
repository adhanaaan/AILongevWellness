"use client";

import { useState } from "react";
import { Moon, Activity, Utensils, Scale, ClipboardList, Smile, Meh, Frown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils/cn";

const WEEKLY_TREND = [62, 70, 58, 74, 80, 66, 72]; // mock relative daily wellness index, Mon–Sun

const MOODS = [
  { key: "great", label: "Great", icon: Smile },
  { key: "okay", label: "Okay", icon: Meh },
  { key: "low", label: "Low", icon: Frown },
] as const;

const SUPPLEMENTS = ["Omega-3", "Vitamin D", "Magnesium"];

export default function TrackingPage() {
  const [mood, setMood] = useState<(typeof MOODS)[number]["key"]>("okay");
  const [meals, setMeals] = useState(1);
  const [supplementsTaken, setSupplementsTaken] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg text-charcoal">Daily tracking</h1>
        <p className="mt-1 text-body-md text-ink-muted">A quick log — wearable data syncs automatically.</p>
      </div>

      <Card>
        <p className="mb-2 text-label-md text-charcoal">This week</p>
        <div className="flex items-end gap-2 h-16">
          {WEEKLY_TREND.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-full bg-sage-tint" style={{ height: `${v}%` }}>
                <div className="h-full w-full rounded-full bg-sage" style={{ opacity: 0.85 }} />
              </div>
              <span className="text-caption text-ink-muted">{"MTWTFSS"[i]}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm" className="flex flex-col gap-1">
          <Moon size={18} className="text-sage-dark" />
          <p className="text-headline-md text-charcoal">7.2h</p>
          <p className="text-caption text-ink-muted">Sleep last night</p>
        </Card>
        <Card padding="sm" className="flex flex-col gap-1">
          <Activity size={18} className="text-sage-dark" />
          <p className="text-headline-md text-charcoal">6,410</p>
          <p className="text-caption text-ink-muted">Steps today</p>
        </Card>

        <Card padding="sm" className="col-span-2 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sage-dark">
            <Smile size={18} />
            <span className="text-label-md text-charcoal">Mood</span>
          </div>
          <div className="flex gap-2">
            {MOODS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMood(key)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-2",
                  mood === key ? "border-sage bg-sage-tint text-sage-dark" : "border-border text-ink-muted"
                )}
              >
                <Icon size={18} />
                <span className="text-caption">{label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card padding="sm" className="flex flex-col gap-1">
          <Utensils size={18} className="text-sage-dark" />
          <p className="text-headline-md text-charcoal">{meals} logged</p>
          <Button size="sm" shape="md" variant="secondary" className="mt-1" onClick={() => setMeals((m) => m + 1)}>
            Add meal
          </Button>
        </Card>
        <Card padding="sm" className="flex flex-col gap-1">
          <Scale size={18} className="text-sage-dark" />
          <p className="text-headline-md text-charcoal">82.0 kg</p>
          <p className="text-caption text-ink-muted">This morning</p>
        </Card>

        <Card padding="sm" className="col-span-2 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-sage-dark" />
            <span className="text-label-md text-charcoal">Supplements</span>
          </div>
          {SUPPLEMENTS.map((s) => (
            <div key={s} className="flex items-center justify-between">
              <span className="text-body-md text-charcoal">{s}</span>
              <Toggle
                checked={Boolean(supplementsTaken[s])}
                onChange={(v) => setSupplementsTaken((prev) => ({ ...prev, [s]: v }))}
                label={s}
              />
            </div>
          ))}
        </Card>
      </div>

      <p className="text-caption text-ink-muted">Wearable data syncs automatically — no need to log steps or sleep manually.</p>
    </div>
  );
}
