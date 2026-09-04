import React from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Pillar } from "@/lib/types/db";

export interface PillarTabsProps {
  active: Pillar;
  onChange: (pillar: Pillar) => void;
}

const PILLARS: { value: Pillar; label: string }[] = [
  { value: "vascular", label: "Vascular" },
  { value: "metabolic", label: "Metabolic" },
  { value: "mental", label: "Mental" },
];

export function PillarTabs({ active, onChange }: PillarTabsProps) {
  return (
    <SegmentedControl
      options={PILLARS}
      value={active}
      onChange={(v) => onChange(v as Pillar)}
    />
  );
}
