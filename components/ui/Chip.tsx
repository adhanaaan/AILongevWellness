"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ChipProps {
  selected?: boolean;
  onToggle?: () => void;
  children: ReactNode;
  className?: string;
}

export function Chip({ selected, onToggle, children, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2 text-label-md transition-colors",
        selected
          ? "bg-sage text-white border-sage"
          : "bg-surface text-charcoal border-border-strong hover:bg-sage-tint",
        className
      )}
    >
      {children}
    </button>
  );
}
