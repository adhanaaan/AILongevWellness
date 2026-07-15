"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { ChatBubble } from "@/components/participant/ChatBubble";
import { SuggestionChips } from "@/components/participant/SuggestionChips";
import { respondAsAva } from "@/lib/ava/respond";
import type { SignedCard } from "@/lib/data/repository";

interface Message {
  role: "user" | "ava";
  text: string;
}

const SUGGESTIONS = [
  "What does my metabolic score mean?",
  "Why is my biological age lower?",
  "What should I focus on?",
  "Can you give me a diagnosis?",
];

export function AvaChat({ card }: { card: SignedCard }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "user",
      text: "What does my metabolic score mean?",
    },
    {
      role: "ava",
      text: respondAsAva("What does my metabolic score mean?", card),
    },
  ]);
  const [input, setInput] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = respondAsAva(trimmed, card);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }, { role: "ava", text: reply }]);
    setInput("");
  }

  return (
    <div className="flex min-h-[80vh] flex-col">
      <div>
        <h1 className="text-headline-lg text-charcoal">Ask AVA about your results</h1>
        <p className="mt-1 text-caption text-ink-muted">Read-only · based on your reviewed card</p>
      </div>

      <div className="mt-5 flex-1 space-y-3">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role}>
            {m.text}
          </ChatBubble>
        ))}
      </div>

      <div className="sticky bottom-0 mt-4 space-y-3 bg-bone pb-2 pt-2">
        <SuggestionChips items={SUGGESTIONS} onPick={send} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your card…"
            className="flex-1 rounded-full border border-border-strong bg-surface px-4 py-2.5 text-body-md focus:outline-none focus:ring-2 focus:ring-sage"
          />
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage text-white"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
