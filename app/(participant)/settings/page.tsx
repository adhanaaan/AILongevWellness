import { User, ShieldCheck, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { repository, DEMO_PARTICIPANT_ID } from "@/lib/data/mock";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const participant = await repository.getParticipant(DEMO_PARTICIPANT_ID);
  if (!participant) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg text-charcoal">Settings</h1>

      <Card className="flex items-center gap-4">
        <Avatar initials={participant.name.slice(0, 1)} size="lg" />
        <div>
          <p className="text-headline-md text-charcoal">{participant.name}</p>
          <p className="text-caption text-ink-muted">
            {participant.age} · {participant.sex} · {participant.height_cm}cm · {participant.weight_kg}kg
          </p>
        </div>
      </Card>

      <Card className="flex items-center gap-3">
        <User size={18} className="text-sage-dark" />
        <div>
          <p className="text-label-md text-charcoal">Goals</p>
          <p className="text-caption text-ink-muted">{participant.goals.join(", ")}</p>
        </div>
      </Card>

      <Card className="flex items-center gap-3">
        <ShieldCheck size={18} className="text-sage-dark" />
        <div>
          <p className="text-label-md text-charcoal">Privacy &amp; consent</p>
          <p className="text-caption text-ink-muted">You agreed to the wellness consent terms during onboarding.</p>
        </div>
      </Card>

      <Card className="flex items-center gap-3">
        <FileText size={18} className="text-sage-dark" />
        <div>
          <p className="text-label-md text-charcoal">About AI Wellness</p>
          <p className="text-caption text-ink-muted">HSBC executive retreat pilot · wellness insights, not diagnosis.</p>
        </div>
      </Card>
    </div>
  );
}
