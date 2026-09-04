import { router } from "expo-router";
import { useEffect } from "react";

import { onNativeDeepLink } from ".";

/**
 * Routes deep links the shell hands back after an external browser trip
 * (currently only the Terra OAuth return).
 *
 * Needed because the OAuth redirect lands in the SYSTEM browser, not in our
 * WebView -- so the web app never sees it as a navigation and cannot read the
 * params from window.location. The shell parses them out of the auth session
 * result and forwards them here instead.
 *
 * Mount once, at the root layout. No-ops in a browser, where the redirect is an
 * ordinary navigation and needs no help.
 */
export function useNativeDeepLinkRouting(): void {
  useEffect(
    () =>
      onNativeDeepLink(({ path, params }) => {
        // replace, not push: the OAuth hop is not somewhere the user should be
        // able to navigate back into.
        router.replace({ pathname: path as never, params });
      }),
    []
  );
}
