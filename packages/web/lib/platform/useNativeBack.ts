import { router } from "expo-router";
import { useEffect } from "react";

import { getPlatform } from "./init";

/**
 * Answers the shell's Android hardware-back requests.
 *
 * The web app resolves this rather than the shell walking WebView history,
 * because several flows navigate with router.replace() (app/index.tsx,
 * useChannelUpload's leave()), which pushes no history entry. WebView history
 * is therefore not a faithful model of where "back" should go -- it would skip
 * screens, or exit the app while the user still had somewhere to return to.
 *
 * Mount once, at the root layout. No-ops in a browser.
 */
export function useNativeBackHandler(): void {
  useEffect(() => {
    const { bridge } = getPlatform();
    if (!bridge) return;

    bridge.setHandler("navigation:back", () => {
      if (router.canGoBack()) {
        router.back();
        return { handled: true };
      }
      // Nothing to go back to -- the shell closes the app, matching what a user
      // expects from back on a first screen.
      return { handled: false };
    });
  }, []);
}
