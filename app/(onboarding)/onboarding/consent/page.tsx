"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  {
    key: "wellness",
    text: "I understand this is a wellness programme, not a medical diagnosis.",
  },
  {
    key: "reviewed",
    text: "I consent to my data being reviewed by the care team (GP and TCM practitioner).",
  },
  {
    key: "privacy",
    text: "I have read and agree to the privacy terms.",
  },
] as const;

export default function ConsentPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = ITEMS.every((item) => checked[item.key]);

  return (
    <div className="flex min-h-[80vh] flex-col">
      <h1 className="text-headline-lg text-charcoal">Consent &amp; wellness disclaimer</h1>
      <p className="mt-2 text-body-md text-ink-muted">
        Before we begin, please confirm the following.
      </p>

      <div className="mt-8 space-y-3">
        {ITEMS.map((item) => {
          const isChecked = Boolean(checked[item.key]);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setChecked((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
              className="flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-4 text-left shadow-card"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                  isChecked ? "border-sage bg-sage text-white" : "border-border-strong"
                )}
              >
                {isChecked && <Check size={14} />}
              </span>
              <span className="text-body-md text-charcoal">{item.text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-10">
        <Button className="w-full" size="lg" disabled={!allChecked} onClick={() => router.push("/onboarding/profile")}>
          Agree and continue
        </Button>
      </div>
    </div>
  );
}
