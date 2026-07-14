import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

export interface CareTeamBadgeProps {
  gpInitials: string;
  tcmInitials: string;
}

export function CareTeamBadge({ gpInitials, tcmInitials }: CareTeamBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-card">
      <div className="flex -space-x-2">
        <Avatar initials={gpInitials} size="sm" className="ring-2 ring-surface" />
        <Avatar initials={tcmInitials} size="sm" className="ring-2 ring-surface" />
      </div>
      <div className="flex items-center gap-1.5 text-caption text-ink-muted">
        <ShieldCheck size={14} className="text-sage" />
        <span>Reviewed and signed off by your care team</span>
      </div>
    </div>
  );
}
