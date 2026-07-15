import { MobileShell } from "@/components/layout/MobileShell";
import { repository, DEMO_PARTICIPANT_ID } from "@/lib/data/mock";

// Reads the mutable in-memory mock store — must not be statically cached.
export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const participant = await repository.getParticipant(DEMO_PARTICIPANT_ID);
  return (
    <MobileShell name={participant?.name.split(" ")[0] ?? "there"}>{children}</MobileShell>
  );
}
