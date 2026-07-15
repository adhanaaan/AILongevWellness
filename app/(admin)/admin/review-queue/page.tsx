import { repository } from "@/lib/data/mock";
import { AdminShell } from "@/components/layout/AdminShell";
import { ParticipantTableRow } from "@/components/admin/ParticipantTableRow";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const summaries = await repository.listParticipants();
  const queue = summaries.filter((s) => s.pipeline.state === "gp_review" || s.pipeline.state === "tcm_review");

  return (
    <AdminShell title="Review queue">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-surface-muted text-caption text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Participant</th>
                <th className="px-4 py-3 font-semibold">Capture</th>
                <th className="px-4 py-3 font-semibold">Pipeline status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {queue.map((summary) => (
                <ParticipantTableRow key={summary.participant.id} summary={summary} />
              ))}
            </tbody>
          </table>
        </div>
        {queue.length === 0 && <p className="p-6 text-center text-body-md text-ink-muted">Nothing awaiting review.</p>}
      </div>
    </AdminShell>
  );
}
