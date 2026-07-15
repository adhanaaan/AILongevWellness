import { cn } from "@/lib/utils/cn";

export interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  tone?: "sage" | "terracotta";
}

export function ProgressBar({ value, className, tone = "sage" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", tone === "sage" ? "bg-sage" : "bg-terracotta")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
