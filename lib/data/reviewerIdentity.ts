import { Platform } from "react-native";

const STORAGE_KEY = "ai-wellness:last-reviewer";

interface SavedReviewer {
  name: string;
  credential: string;
}

/**
 * Web-only (the deployment target) -- remembers the last reviewer's name and
 * credential across sign-offs in this browser, so a GP or TCM reviewer
 * working through a whole retreat cohort doesn't retype the same identity
 * for every single participant.
 */
export function getSavedReviewer(): SavedReviewer | null {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedReviewer) : null;
  } catch {
    return null;
  }
}

export function saveReviewer(reviewer: SavedReviewer) {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviewer));
  } catch {
    // Storage full/unavailable -- not worth failing the sign-off over.
  }
}
