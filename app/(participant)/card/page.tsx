import Link from "next/link";
import { Clock } from "lucide-react";
import { repository, DEMO_PARTICIPANT_ID } from "@/lib/data/mock";
import { BiologicalAgeHero } from "@/components/participant/BiologicalAgeHero";
import { ScoreRing } from "@/components/participant/ScoreRing";
import { KeyContributorItem } from "@/components/participant/KeyContributorItem";
import { SuggestedFocusGrid } from "@/components/participant/SuggestedFocusGrid";
import { CareTeamBadge } from "@/components/participant/CareTeamBadge";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default async function CardPage() {
  const signedCard = await repository.getSignedCard(DEMO_PARTICIPANT_ID);

  if (!signedCard) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-tint text-sage-dark">
          <Clock size={24} />
        </span>
        <h1 className="mt-4 text-headline-md text-charcoal">Your snapshot is being prepared</h1>
        <p className="mt-2 max-w-xs text-body-md text-ink-muted">
          Your care team is reviewing your results. We&apos;ll let you know as soon as your health card is ready.
        </p>
      </div>
    );
  }

  const { aiDraft, reviews } = signedCard;
  const gp = reviews.find((r) => r.stage === "gp");
  const tcm = reviews.find((r) => r.stage === "tcm");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg text-charcoal">Your executive wellness snapshot</h1>
        <p className="mt-1 text-body-md text-ink-muted">Reviewed and signed off by your care team.</p>
      </div>

      <BiologicalAgeHero bioAge={aiDraft.biological_age} chronoAge={aiDraft.chronological_age} />

      <div className="grid grid-cols-3 gap-2">
        <ScoreRing value={aiDraft.scores.vascular} label="Vascular" status={aiDraft.scores.vascular >= 70 ? "good" : "monitor"} />
        <ScoreRing value={aiDraft.scores.metabolic} label="Metabolic" status={aiDraft.scores.metabolic >= 70 ? "good" : "monitor"} />
        <ScoreRing value={aiDraft.scores.mental} label="Mental" status={aiDraft.scores.mental >= 70 ? "good" : "monitor"} />
      </div>

      <div>
        <h2 className="mb-3 text-label-md text-charcoal">Key contributors</h2>
        <div className="space-y-2">
          {aiDraft.key_contributors.map((c) => (
            <KeyContributorItem key={c.text} text={c.text} tone={c.tone} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-label-md text-charcoal">Suggested focus</h2>
        <SuggestedFocusGrid items={aiDraft.suggested_focus} />
      </div>

      {gp && tcm && <CareTeamBadge gpInitials={initialsOf(gp.reviewer_name)} tcmInitials={initialsOf(tcm.reviewer_name)} />}

      <Link href="/ava">
        <Button className="w-full" size="lg">
          Ask about my results
        </Button>
      </Link>
    </div>
  );
}
