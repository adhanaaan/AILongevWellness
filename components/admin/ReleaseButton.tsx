"use client";

import { useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { releaseCardAction } from "@/lib/data/actions";

export function ReleaseButton({ participantId, enabled }: { participantId: string; enabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      className="w-full"
      shape="md"
      disabled={!enabled || isPending}
      iconRight={<Send size={16} />}
      onClick={() =>
        startTransition(async () => {
          await releaseCardAction(participantId);
        })
      }
    >
      {isPending ? "Releasing…" : "Release health card"}
    </Button>
  );
}
