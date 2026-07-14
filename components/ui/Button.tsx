"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconRight?: ReactNode;
  iconLeft?: ReactNode;
  /** Admin surfaces use a tighter, squared-off radius per COMPONENTS.md. */
  shape?: "full" | "md";
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-caption px-3 py-1.5 gap-1.5",
  md: "text-label-md px-5 py-2.5 gap-2",
  lg: "text-label-md px-6 py-3.5 gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  shape = "full",
  iconRight,
  iconLeft,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors",
        shape === "full" ? "rounded-full" : "rounded-md",
        SIZE_CLASSES[size],
        disabled
          ? "bg-surface-muted text-ink-muted cursor-not-allowed shadow-none"
          : variant === "primary"
          ? "bg-sage text-white shadow-soft hover:bg-sage-dark"
          : variant === "secondary"
          ? "border border-border-strong text-sage bg-surface hover:bg-sage-tint"
          : "text-sage hover:bg-sage-tint",
        className
      )}
      {...props}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
