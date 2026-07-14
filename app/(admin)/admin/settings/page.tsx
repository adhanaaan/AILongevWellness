import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export default function AdminSettingsPage() {
  return (
    <AdminShell title="Settings">
      <Card className="flex items-center gap-4">
        <Avatar initials="HM" size="lg" />
        <div>
          <p className="text-headline-md text-charcoal">Dr. Helena Marsh</p>
          <p className="text-caption text-ink-muted">General Practice · Care team</p>
        </div>
      </Card>
    </AdminShell>
  );
}
