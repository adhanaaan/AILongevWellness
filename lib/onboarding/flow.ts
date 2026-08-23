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
  /**
   * Optional sections ("add when you have it") don't gate onboarding
   * completion. Per Dr. Tong's direction — participants get insights from basic
   * info and add more data over time — the three upload channels are optional;
   * only the Questionnaire and ReCOGnAIze are required to finish.
   */
  optional?: boolean;
}

export const CAPTURE_SECTIONS: CaptureSectionDef[] = [
  // Questionnaire is handled at signup by app/onboarding/quiz.tsx and is filtered
  // out of the capture hub UI; this entry stays only for the gating helpers
  // (deriveSectionState / isCaptureComplete / computeUnlockedSections). The route
  // is a safe live fallback and isn't actually navigated to from the hub.
  { id: "questionnaire", label: "Questionnaire", keys: ["personal_info", "lifestyle"], route: "/onboarding/quiz" },
  { id: "wearables", label: "Wearables", keys: ["wearables"], route: "/onboarding/capture-wearables-intro", optional: true },
  {
    id: "body_composition",
    label: "Body Composition",
    keys: ["body_composition"],
    route: "/onboarding/capture-body-composition-intro",
    optional: true,
  },
  { id: "lab_reports", label: "Lab Reports", keys: ["lab_reports"], route: "/onboarding/capture-lab-reports-intro", optional: true },
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

/**
 * True once the required sections are done — the gate for Calculating. Only the
 * non-optional sections (Questionnaire + ReCOGnAIze) are required; the three
 * upload channels are optional and can be added anytime, so they never block
 * finishing onboarding.
 */
export function isCaptureComplete(progress: OnboardingProgress): boolean {
  return CAPTURE_SECTIONS.filter((s) => !s.optional).every(
    (s) => deriveSectionState(progress, s) === "done"
  );
}

/**
 * The unlock order: Questionnaire is always open; once it's done, the three
 * optional upload channels AND ReCOGnAIze all unlock together. ReCOGnAIze no
 * longer waits on the uploads — a participant with no lab report / wearable /
 * body-comp scan can still reach it and finish onboarding. Single source of
 * truth for both MockRepository and SupabaseRepository so they can't drift.
 */
export function computeUnlockedSections(
  sections: Record<OnboardingSectionKey, OnboardingSectionStatus>
): OnboardingSectionKey[] {
  const unlocked: OnboardingSectionKey[] = ["personal_info", "lifestyle"];
  if (sections.personal_info === "done" && sections.lifestyle === "done") {
    unlocked.push("wearables", "body_composition", "lab_reports", "recognize");
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
