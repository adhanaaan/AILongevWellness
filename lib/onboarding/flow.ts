import type {
  CaptureChannel,
  CaptureChannelName,
  CaptureChannelStatus,
  OnboardingProgress,
  OnboardingSectionKey,
  OnboardingSectionStatus,
} from "@/lib/types/db";

const ONBOARDING_SECTION_KEYS: OnboardingSectionKey[] = [
  "personal_info",
  "lifestyle",
  "wearables",
  "body_composition",
  "lab_reports",
  "recognize",
];

/**
 * The five cards shown on the Data Capture hub. "questionnaire" bundles the
 * fixed, non-skippable personal_info -> lifestyle pair; the rest map 1:1 to an
 * OnboardingSectionKey.
 */
export type CaptureSectionId =
  | "questionnaire"
  | "wearables"
  | "body_composition"
  | "lab_reports"
  | "recognize";

export type CaptureSectionState = "locked" | "available" | "in_progress" | "done";

export interface CaptureSectionDef {
  id: CaptureSectionId;
  label: string;
  keys: OnboardingSectionKey[];
  /** Route to open when the section is tapped (its first screen). */
  route: string;
}

export const CAPTURE_SECTIONS: CaptureSectionDef[] = [
  { id: "questionnaire", label: "Questionnaire", keys: ["personal_info", "lifestyle"], route: "/onboarding/profile-intro" },
  { id: "wearables", label: "Wearables", keys: ["wearables"], route: "/onboarding/capture-wearables-intro" },
  {
    id: "body_composition",
    label: "Body Composition",
    keys: ["body_composition"],
    route: "/onboarding/capture-body-composition-intro",
  },
  { id: "lab_reports", label: "Lab Reports", keys: ["lab_reports"], route: "/onboarding/capture-lab-reports-intro" },
  { id: "recognize", label: "ReCOGnAIze", keys: ["recognize"], route: "/onboarding/capture-recognaize" },
];

export function deriveSectionState(
  progress: OnboardingProgress,
  section: CaptureSectionDef
): CaptureSectionState {
  const locked = section.keys.some((k) => !progress.unlocked.includes(k));
  if (locked) return "locked";
  const statuses = section.keys.map((k) => progress.sections[k]);
  if (statuses.every((s) => s === "done")) return "done";
  if (statuses.some((s) => s !== "not_started")) return "in_progress";
  return "available";
}

/** True once every hub section (including ReCOGnAIze) is done — the gate for Calculating. */
export function isCaptureComplete(progress: OnboardingProgress): boolean {
  return CAPTURE_SECTIONS.every((s) => deriveSectionState(progress, s) === "done");
}

/**
 * The fixed unlock order: Questionnaire is always open; the free-order trio
 * unlocks once Questionnaire is done; ReCOGnAIze unlocks once the trio is done.
 * Single source of truth for both MockRepository and SupabaseRepository so
 * they can't drift out of sync with each other.
 */
export function computeUnlockedSections(
  sections: Record<OnboardingSectionKey, OnboardingSectionStatus>
): OnboardingSectionKey[] {
  const unlocked: OnboardingSectionKey[] = ["personal_info", "lifestyle"];
  if (sections.personal_info === "done" && sections.lifestyle === "done") {
    unlocked.push("wearables", "body_composition", "lab_reports");
  }
  if (
    sections.wearables === "done" &&
    sections.body_composition === "done" &&
    sections.lab_reports === "done"
  ) {
    unlocked.push("recognize");
  }
  return unlocked;
}

const SECTION_KEYS_BY_CHANNEL: Record<CaptureChannelName, OnboardingSectionKey[]> = {
  manual: ["personal_info", "lifestyle"],
  wearables: ["wearables"],
  body_composition: ["body_composition"],
  lab_report: ["lab_reports"],
  recognize: ["recognize"],
};

function sectionStatusFromChannelStatus(status: CaptureChannelStatus): OnboardingSectionStatus {
  if (status === "complete") return "done";
  if (status === "partial") return "in_progress";
  return "not_started";
}

/**
 * Reconstructs onboarding progress from the real, persisted capture_channels
 * table, rather than starting from a blank slate. capture_channels is the
 * only one of the two that's actually written to Supabase (OnboardingProgress
 * itself is a per-session in-memory record on the real backend) — deriving
 * from it is what lets a returning participant's progress survive a fresh
 * sign-in instead of looking like onboarding was never done.
 */
export function deriveOnboardingProgress(
  participantId: string,
  channels: CaptureChannel[]
): OnboardingProgress {
  const sections = Object.fromEntries(
    ONBOARDING_SECTION_KEYS.map((key) => [key, "not_started" as OnboardingSectionStatus])
  ) as Record<OnboardingSectionKey, OnboardingSectionStatus>;

  for (const channel of channels) {
    const status = sectionStatusFromChannelStatus(channel.status);
    for (const key of SECTION_KEYS_BY_CHANNEL[channel.channel]) {
      sections[key] = status;
    }
  }

  return { participant_id: participantId, sections, unlocked: computeUnlockedSections(sections) };
}
