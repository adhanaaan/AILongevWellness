import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export interface SummaryStatCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone?: "sage" | "terracotta" | "danger" | "neutral";
}

const TONE_CLASSES: Record<NonNullable<SummaryStatCardProps["tone"]>, string> = {
  sage: "bg-sage-tint text-sage-dark",
  terracotta: "bg-terracotta-tint text-terracotta-ink",
  danger: "bg-danger-tint text-danger",
  neutral: "bg-surface-muted text-ink-muted",
};

export function SummaryStatCard({ icon, label, value, tone = "neutral" }: SummaryStatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", TONE_CLASSES[tone])}>
        {icon}
      </span>
      <div>
        <p className="text-headline-md text-charcoal">{value}</p>
        <p className="text-caption text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}
