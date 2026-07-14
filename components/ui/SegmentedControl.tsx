"use client";

import { cn } from "@/lib/utils/cn";

export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn("inline-flex rounded-full bg-surface-muted p-1", className)} role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-label-md transition-colors",
              active ? "bg-surface text-sage shadow-card" : "text-ink-muted"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
