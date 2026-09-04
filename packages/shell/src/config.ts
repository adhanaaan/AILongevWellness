import Constants from "expo-constants";

/**
 * Which web app this shell loads.
 *
 * The shell contains no product code -- every participant and admin screen is
 * served from packages/web's Vercel deployment. Getting this URL wrong means
 * shipping a store build that points at the wrong environment, and there is no
 * in-app way to notice, so treat it as release-critical.
 */

// TODO: confirm the production domain before the first store submission.
// Taken from packages/web/.env.example's APP_URL example value.
const PROD_WEB_APP_URL = "https://ai-longev-wellness.vercel.app";

// Dev builds point at a Vercel preview rather than a LAN dev server: `expo
// start --web` serves over http, and both platforms block mixed/cleartext
// content in a WebView by default. Override per-machine with EXPO_PUBLIC_WEB_APP_URL.
const DEV_WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL ?? PROD_WEB_APP_URL;

// Set only by an env-targeted EAS profile (see app.config.ts). Every other
// build, including `production`, leaves this undefined and falls through to
// the __DEV__ choice below.
const override = Constants.expoConfig?.extra?.webAppUrl as string | undefined;

export const config = {
  /** URL of the web app loaded into the WebView. */
  webAppUrl: override ?? (__DEV__ ? DEV_WEB_APP_URL : PROD_WEB_APP_URL),
} as const;

/** Origin of {@link config.webAppUrl}, for navigation allow-listing. */
export const APP_ORIGIN = new URL(config.webAppUrl).origin;
