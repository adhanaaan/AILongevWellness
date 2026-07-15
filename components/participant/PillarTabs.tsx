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
  const selectedIndex = PILLARS.findIndex((p) => p.value === active);

  const handleChange = (index: number) => {
    onChange(PILLARS[index].value);
  };

  return (
    <SegmentedControl
      segments={PILLARS.map((p) => p.label)}
      selectedIndex={selectedIndex}
      onChange={handleChange}
    />
  );
}
