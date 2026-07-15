import { Download } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ExportsPage() {
  return (
    <AdminShell title="Exports">
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-label-md text-charcoal">Delivered participant summaries</p>
          <p className="text-caption text-ink-muted">Export signed-off wellness cards for the retreat record.</p>
        </div>
        <Button variant="secondary" shape="md" iconLeft={<Download size={16} />}>
          Export CSV
        </Button>
      </Card>
      <p className="mt-4 text-caption text-ink-muted">
        Exports are a placeholder in this mock-data build — wiring to real storage comes with the Supabase pass.
      </p>
    </AdminShell>
  );
}
