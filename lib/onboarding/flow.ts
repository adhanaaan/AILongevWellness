import type { OnboardingProgress, OnboardingSectionKey } from "@/lib/types/db";

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
  { id: "questionnaire", label: "Questionnaire", keys: ["personal_info", "lifestyle"], route: "/onboarding/profile" },
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
