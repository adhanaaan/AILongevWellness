"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Pillar } from "@/lib/types/db";

const OPTIONS: { value: Pillar; label: string }[] = [
  { value: "vascular", label: "Vascular" },
  { value: "metabolic", label: "Metabolic" },
  { value: "mental", label: "Mental" },
];

export interface PillarTabsProps {
  active: Pillar;
  onChange: (pillar: Pillar) => void;
}

export function PillarTabs({ active, onChange }: PillarTabsProps) {
  return <SegmentedControl options={OPTIONS} value={active} onChange={(v) => onChange(v as Pillar)} />;
}
