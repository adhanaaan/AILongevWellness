import { repository, DEMO_PARTICIPANT_ID } from "@/lib/data/mock";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const participant = await repository.getParticipant(DEMO_PARTICIPANT_ID);
  if (!participant) return null;
  return <ProfileForm participant={participant} />;
}
