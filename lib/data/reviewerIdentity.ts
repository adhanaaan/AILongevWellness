import { Platform } from "react-native";
import type { ReviewStage } from "../types/db";

const STORAGE_PREFIX = "ai-wellness:last-reviewer";

interface SavedReviewer {
  name: string;
  credential: string;
}

// Keyed by stage (gp / tcm) so each card remembers its OWN reviewer. A single
// shared key would pre-fill the TCM card with the GP's identity after the GP
// signs — and, if the TCM reviewer didn't notice and retype, attribute the GP's
// name to the TCM signature. Per-stage keys keep the async GP/TCM review honest.
function keyFor(stage: ReviewStage): string {
  return `${STORAGE_PREFIX}:${stage}`;
}

/**
 * Web-only (the deployment target) -- remembers the last reviewer's name and
 * credential for THIS stage across sign-offs in this browser, so a GP or TCM
 * reviewer working through a whole retreat cohort doesn't retype their identity
 * for every single participant.
 */
export function getSavedReviewer(stage: ReviewStage): SavedReviewer | null {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(stage));
    return raw ? (JSON.parse(raw) as SavedReviewer) : null;
  } catch {
    return null;
  }
}

export function saveReviewer(stage: ReviewStage, reviewer: SavedReviewer) {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(keyFor(stage), JSON.stringify(reviewer));
  } catch {
    // Storage full/unavailable -- not worth failing the sign-off over.
  }
}
