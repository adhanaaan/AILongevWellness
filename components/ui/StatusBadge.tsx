import { cn } from "@/lib/utils/cn";

export type Status =
  | "good"
  | "strong"
  | "signed"
  | "delivered"
  | "monitor"
  | "needs-attention"
  | "capturing"
  | "ai_drafted"
  | "gp_review"
  | "tcm_review"
  | "neutral";

const LABELS: Record<Status, string> = {
  good: "Good",
  strong: "Strong",
  signed: "Signed",
  delivered: "Delivered",
  monitor: "Monitor",
  "needs-attention": "Needs attention",
  capturing: "Capturing",
  ai_drafted: "AI drafted",
  gp_review: "GP review",
  tcm_review: "TCM review",
  neutral: "In progress",
};

const SAGE: Status[] = ["good", "strong", "signed", "delivered"];
const NEUTRAL: Status[] = ["capturing", "ai_drafted", "gp_review", "tcm_review", "neutral"];

export interface StatusBadgeProps {
  status: Status;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const tone = SAGE.includes(status)
    ? "bg-sage-tint text-sage-dark"
    : status === "monitor"
    ? "bg-terracotta-tint text-terracotta-ink"
    : status === "needs-attention"
    ? "bg-danger-tint text-danger"
    : NEUTRAL.includes(status)
    ? "bg-surface-muted text-ink-muted"
    : "bg-surface-muted text-ink-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-caption font-semibold whitespace-nowrap",
        tone,
        className
      )}
    >
      {label ?? LABELS[status]}
    </span>
  );
}
