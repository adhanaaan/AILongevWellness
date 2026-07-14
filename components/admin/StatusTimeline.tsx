import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface StatusTimelineProps {
  stages: string[];
  /** Index of the stage currently in progress (0-based). Earlier stages are done, later are locked. */
  currentIndex: number;
}

export function StatusTimeline({ stages, currentIndex }: StatusTimelineProps) {
  return (
    <ol className="flex items-center">
      {stages.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const locked = i > currentIndex;
        return (
          <li key={stage} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-caption font-semibold",
                  done && "border-sage bg-sage text-white",
                  active && "border-sage text-sage-dark bg-surface",
                  locked && "border-border-strong text-ink-muted bg-surface-muted"
                )}
              >
                {done ? <Check size={16} /> : locked ? <Lock size={14} /> : i + 1}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-caption",
                  active ? "text-charcoal font-semibold" : "text-ink-muted"
                )}
              >
                {stage}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div className={cn("mx-2 h-0.5 flex-1", i < currentIndex ? "bg-sage" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
