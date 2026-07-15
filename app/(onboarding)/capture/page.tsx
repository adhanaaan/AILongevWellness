import { redirect } from "next/navigation";
import { repository, DEMO_PARTICIPANT_ID } from "@/lib/data/mock";
import { CaptureView } from "./CaptureView";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const pipeline = await repository.getPipeline(DEMO_PARTICIPANT_ID);
  const channels = await repository.getCaptureChannels(DEMO_PARTICIPANT_ID);

  if (pipeline && pipeline.state !== "capturing") {
    redirect("/card");
  }

  return <CaptureView channels={channels} />;
}
