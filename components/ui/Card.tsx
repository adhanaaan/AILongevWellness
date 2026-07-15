import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  tinted?: boolean;
}

const PADDING_CLASSES = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

export function Card({ padding = "md", tinted, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border shadow-soft",
        tinted ? "bg-sage-tint" : "bg-surface",
        PADDING_CLASSES[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
