import { repository } from "@/lib/data/mock";
import { AdminShell } from "@/components/layout/AdminShell";
import { ParticipantListView } from "./ParticipantListView";

export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage() {
  const summaries = await repository.listParticipants();
  return (
    <AdminShell title="Participants">
      <ParticipantListView summaries={summaries} />
    </AdminShell>
  );
}
