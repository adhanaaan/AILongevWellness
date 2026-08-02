import { Platform, Alert } from "react-native";

/** Web-only (the Vercel deployment target) — triggers a real file download via a Blob URL. Native falls back to a plain notice rather than silently doing nothing. */
export function downloadTextFile(filename: string, content: string, mimeType: string) {
  if (Platform.OS !== "web") {
    Alert.alert("Web only", "Exports are only available from the web app for now.");
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
