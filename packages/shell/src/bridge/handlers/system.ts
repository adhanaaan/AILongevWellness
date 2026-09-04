import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

/**
 * Opens a URL in a REAL browser rather than our WebView.
 *
 * Required, not cosmetic: identity providers refuse OAuth started inside an
 * embedded WebView -- Google returns `disallowed_useragent` outright -- so the
 * Terra wearable connect flow simply cannot complete in-app. openAuthSessionAsync
 * uses ASWebAuthenticationSession on iOS and Chrome Custom Tabs on Android, both
 * of which are real browsers with real user agents, and both of which share
 * cookies with the system browser (so an already-signed-in user sails through).
 *
 * Note this is driven by an explicit bridge call rather than by intercepting
 * navigation in onShouldStartLoadWithRequest. On Android that maps to
 * shouldOverrideUrlLoading, which is not reliably invoked for JS-initiated
 * navigation without a user gesture -- and the web app kicks this off after an
 * `await`, by which point the gesture is gone. Interception remains only as a
 * safety net for links we didn't anticipate.
 */

/** Custom scheme, because openAuthSessionAsync only auto-dismisses on one. */
const RETURN_PATH = "oauth-return";

export interface SystemHandlerDeps {
  emitDeepLink: (payload: { path: string; params: Record<string, string> }) => void;
}

export function createSystemHandlers({ emitDeepLink }: SystemHandlerDeps) {
  return {
    async openExternal(params: { url: string; returnTo?: string }): Promise<{ ok: true }> {
      const returnUrl = Linking.createURL(RETURN_PATH);

      const result = await WebBrowser.openAuthSessionAsync(params.url, returnUrl);

      // "cancel"/"dismiss" mean the user backed out; the web app keeps whatever
      // state it had, so there is nothing to report.
      if (result.type !== "success") return { ok: true };

      const parsed = Linking.parse(result.url);
      const query: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed.queryParams ?? {})) {
        if (typeof value === "string") query[key] = value;
      }

      // The web app can't read window.location.search for this -- the redirect
      // landed in the system browser, not in the WebView -- so hand it the
      // params explicitly along with where to go.
      emitDeepLink({ path: params.returnTo ?? `/${RETURN_PATH}`, params: query });

      return { ok: true };
    },
  };
}
