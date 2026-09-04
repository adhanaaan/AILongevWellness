/**
 * The handful of brand values the shell's own native chrome needs (splash
 * background, offline screen, safe-area bands).
 *
 * Deliberately duplicated from packages/web/lib/theme/tokens.ts rather than
 * imported: the shell is a standalone package with its own node_modules so its
 * Expo SDK can differ from web's, and reaching across that boundary for five
 * colours would undo that isolation. Keep in sync by hand -- if these ever
 * drift, the visible symptom is a mismatched band around the WebView.
 */
export const colors = {
  /** colors.cloud / colors.bone — the app background, so the WebView's frame matches. */
  background: "#FAFAFA",
  /** teal[500] — brand primary. */
  primary: "#2C4A38",
  /** gray[900] — colors.ink. */
  ink: "#1A1F2B",
  /** gray[600] — colors.inkMuted. */
  inkMuted: "#6B7386",
  /** gray[200] — borders. */
  border: "#DDE1E7",
  white: "#FFFFFF",
} as const;
