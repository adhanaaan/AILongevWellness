import type { OnboardingProgress, OnboardingSectionKey } from "@/lib/types/db";

/**
 * The six cards shown on the Data Capture hub. "profile" and "wellness_lifestyle"
 * are the fixed, non-skippable pair that starts the flow (personal_info and
 * lifestyle respectively); the rest map 1:1 to an OnboardingSectionKey.
 */
export type CaptureSectionId =
  | "profile"
  | "wellness_lifestyle"
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
  { id: "profile", label: "Create Profile", keys: ["personal_info"], route: "/onboarding/profile" },
  {
    id: "wellness_lifestyle",
    label: "Wellness & Lifestyle",
    keys: ["lifestyle"],
    route: "/onboarding/profile-goals",
  },
  { id: "wearables", label: "Wearables", keys: ["wearables"], route: "/onboarding/capture-wearables-intro" },
  {
    id: "body_composition",
    label: "Body Composition",
    keys: ["body_composition"],
    route: "/onboarding/capture-body-composition-intro",
  },
  { id: "lab_reports", label: "Lab Reports", keys: ["lab_reports"], route: "/onboarding/capture-lab-reports-intro" },
  { id: "recognize", label: "ReCOGnAIze", keys: ["recognize"], route: "/onboarding/capture-recognaize-intro" },
];

export function deriveSectionState(
  progress: OnboardingProgress,
  section: CaptureSectionDef
): CaptureSectionState {
  const locked = section.keys.some((k) => !progress.unlocked.includes(k));
  if (locked) return "locked";
  const statuses = section.keys.map((k) => progress.sections[k]);
  if (statuses.every((s) => s === "done" || s === "acknowledged")) return "done";
  if (statuses.some((s) => s !== "not_started")) return "in_progress";
  return "available";
}

/** True once every hub section (including ReCOGnAIze) is done — the gate for Calculating. */
export function isCaptureComplete(progress: OnboardingProgress): boolean {
  return CAPTURE_SECTIONS.every((s) => deriveSectionState(progress, s) === "done");
}

/** The free-order middle trio — unlocks together, and ReCOGnAIze unlocks once all three are done. */
export const TRIO_KEYS: OnboardingSectionKey[] = ["wearables", "body_composition", "lab_reports"];

/** True once Wearables, Body Composition, and Lab Reports are all done, in any order. */
export function isTrioComplete(progress: OnboardingProgress): boolean {
  return TRIO_KEYS.every((k) => progress.sections[k] === "done");
}

/**
 * Every distinct screen/beat in the onboarding flow, in narrative order. The
 * three Data Capture hub revisits (between Wearables/Body Composition/Lab
 * Reports) all land on the same `/onboarding/capture` route, so they collapse
 * to one entry here rather than three — this models the 15-step user-facing
 * narrative as 12 tracked steps. Not rendered as a single mega-stepper
 * anywhere; it's a shared source of truth so the two chrome components
 * (OnboardingStepper, CaptureFlowStepper) don't drift out of sync as steps
 * are added or removed.
 */
export type FlowStepId =
  | "intro"
  | "account"
  | "profile"
  | "wellness_lifestyle"
  | "intro_snapshot"
  | "wearables"
  | "body_composition"
  | "transition"
  | "lab_reports"
  | "recognize_intro"
  | "recognize"
  | "calculating";

export interface FlowStepDef {
  id: FlowStepId;
  label: string;
  phase: "linear" | "hub";
  route: string;
  /** Only set for steps with a tracked OnboardingProgress completion state. */
  sectionKeys?: OnboardingSectionKey[];
}

export const ONBOARDING_FLOW_STEPS: FlowStepDef[] = [
  { id: "intro", label: "Intro", phase: "linear", route: "/onboarding/intro" },
  { id: "account", label: "Account", phase: "linear", route: "/onboarding/auth" },
  { id: "profile", label: "Create Profile", phase: "hub", route: "/onboarding/profile", sectionKeys: ["personal_info"] },
  {
    id: "wellness_lifestyle",
    label: "Wellness & Lifestyle",
    phase: "hub",
    route: "/onboarding/profile-goals",
    sectionKeys: ["lifestyle"],
  },
  { id: "intro_snapshot", label: "Your Snapshot", phase: "hub", route: "/onboarding/intro-wellness-snapshot" },
  {
    id: "wearables",
    label: "Apple Health",
    phase: "hub",
    route: "/onboarding/capture-wearables-intro",
    sectionKeys: ["wearables"],
  },
  {
    id: "body_composition",
    label: "Body Composition",
    phase: "hub",
    route: "/onboarding/capture-body-composition-intro",
    sectionKeys: ["body_composition"],
  },
  { id: "transition", label: "Almost There", phase: "hub", route: "/onboarding/capture-transition" },
  {
    id: "lab_reports",
    label: "Lab Reports",
    phase: "hub",
    route: "/onboarding/capture-lab-reports-intro",
    sectionKeys: ["lab_reports"],
  },
  { id: "recognize_intro", label: "ReCOGnAIze Intro", phase: "hub", route: "/onboarding/capture-recognaize-intro" },
  {
    id: "recognize",
    label: "ReCOGnAIze",
    phase: "hub",
    route: "/onboarding/capture-recognaize",
    sectionKeys: ["recognize"],
  },
  { id: "calculating", label: "Building Summary", phase: "hub", route: "/onboarding/capture-calculating" },
];

export type FlowStepState = "not_started" | "current" | "done";

export function deriveFlowStepState(
  step: FlowStepDef,
  progress: OnboardingProgress | null,
  pathname: string
): FlowStepState {
  if (pathname === step.route) return "current";
  if (!step.sectionKeys || !progress) return "not_started";
  return step.sectionKeys.every((k) => progress.sections[k] === "done" || progress.sections[k] === "acknowledged")
    ? "done"
    : "not_started";
}
