import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ChatBubbleProps {
  role: "user" | "ava";
  children: ReactNode;
  disclaimer?: string;
}

export function ChatBubble({ role, children, disclaimer }: ChatBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3 text-body-md",
          isUser ? "bg-sage-tint text-charcoal" : "bg-surface border border-border text-charcoal shadow-card"
        )}
      >
        <p className="whitespace-pre-line">{children}</p>
        {disclaimer && <p className="mt-2 text-caption text-ink-muted italic">{disclaimer}</p>}
      </div>
    </div>
  );
}
