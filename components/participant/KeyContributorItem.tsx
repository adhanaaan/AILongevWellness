import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface KeyContributorItemProps {
  icon?: ReactNode;
  text: string;
  tone: "good" | "monitor";
}

export function KeyContributorItem({ icon, text, tone }: KeyContributorItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg p-3",
        tone === "monitor" ? "bg-terracotta-tint" : "bg-sage-tint"
      )}
    >
      <span className={tone === "monitor" ? "text-terracotta-ink" : "text-sage-dark"}>
        {icon ?? (tone === "monitor" ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />)}
      </span>
      <p className={cn("text-body-md", tone === "monitor" ? "text-terracotta-ink" : "text-charcoal")}>{text}</p>
    </div>
  );
}
