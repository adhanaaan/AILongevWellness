import { Platform } from "react-native";

import { getPlatform, isNativeShell } from "./init";

/**
 * What screens should import. Every function here works in a plain browser --
 * either by doing the ordinary web thing, or by reporting honestly that the
 * capability isn't available -- so no caller needs to branch on the platform.
 */

export { getPlatform, initPlatform, isNativeShell, usePlatformInit, type PlatformState } from "./init";
export { NativeBridge } from "./nativeBridge";

/**
 * Opens a URL outside the app's own WebView.
 *
 * In the shell this hands off to a real browser, which is REQUIRED for OAuth:
 * providers reject embedded WebViews (Google returns `disallowed_useragent`), so
 * the Terra connect flow cannot complete in-app. `returnTo` is the route to land
 * back on, delivered through {@link onNativeDeepLink}.
 */
export async function openExternalUrl(url: string, returnTo?: string): Promise<void> {
  const { bridge } = getPlatform();

  if (bridge) {
    try {
      await bridge.request("system:open-external", { url, returnTo });
      return;
    } catch {
      // Old shell without this method. Fall through to the web behaviour, which
      // at least gets the user to the provider even if the return trip is rough.
    }
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.assign(url);
  }
}

/** True only where a daily reminder can actually be scheduled, i.e. in the shell. */
export function canScheduleReminders(): boolean {
  return isNativeShell();
}

/**
 * Schedules (or reschedules) the one daily reminder. Returns false if the user
 * declined notification permission, or if we're not in the shell.
 */
export async function scheduleDailyReminder(params: {
  hour: number;
  minute: number;
  title: string;
  body: string;
}): Promise<boolean> {
  const { bridge } = getPlatform();
  if (!bridge) return false;

  try {
    const { scheduled } = await bridge.request("notifications:scheduleDaily", params);
    return scheduled;
  } catch {
    return false;
  }
}

export async function cancelDailyReminder(): Promise<void> {
  const { bridge } = getPlatform();
  if (!bridge) return;
  try {
    await bridge.request("notifications:cancel", {});
  } catch {
    // Nothing scheduled, or an old shell. Either way the end state is the same.
  }
}

/**
 * Subscribes to deep links delivered by the shell (an OAuth return, primarily).
 * No-ops in a browser, where the params arrive in window.location.search instead.
 */
export function onNativeDeepLink(
  handler: (payload: { path: string; params: Record<string, string> }) => void
): () => void {
  const { bridge } = getPlatform();
  if (!bridge) return () => {};
  return bridge.onEvent("navigation:deep-link", handler);
}

/** Subscribes to connectivity changes reported by the shell. No-ops in a browser. */
export function onNativeConnectivityChange(
  handler: (isConnected: boolean) => void
): () => void {
  const { bridge } = getPlatform();
  if (!bridge) return () => {};
  return bridge.onEvent("connectivity:changed", ({ isConnected }) => handler(isConnected));
}
