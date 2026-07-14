import { MessageCircleOff } from "lucide-react";
import { repository, DEMO_PARTICIPANT_ID } from "@/lib/data/mock";
import { AvaChat } from "./AvaChat";

export const dynamic = "force-dynamic";

export default async function AvaPage() {
  const signedCard = await repository.getSignedCard(DEMO_PARTICIPANT_ID);

  if (!signedCard) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
          <MessageCircleOff size={24} />
        </span>
        <h1 className="mt-4 text-headline-md text-charcoal">AVA isn&apos;t ready yet</h1>
        <p className="mt-2 max-w-xs text-body-md text-ink-muted">
          AVA can only discuss your reviewed and signed health card. It will be available once your care team
          has finished their review.
        </p>
      </div>
    );
  }

  return <AvaChat card={signedCard} />;
}
