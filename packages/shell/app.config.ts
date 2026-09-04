import type { ExpoConfig } from "expo/config";

import baseConfig from "./app.json";

/**
 * Per-environment overrides for which web app the shell loads, selected by an
 * EAS build profile's `APP_ENV` (see eas.json).
 *
 * Read at Node time during config evaluation, not in the RN bundle, so no
 * EXPO_PUBLIC_ prefix is needed. Profiles that don't set APP_ENV leave
 * `extra.webAppUrl` unset, and src/config.ts falls through to its __DEV__ choice.
 */
const ENV_TARGETS: Record<string, { webAppUrl: string }> = {
  // TODO: point at the real Vercel preview/staging deployment.
  staging: { webAppUrl: "https://ai-longev-wellness-staging.vercel.app" },
};

// Cast through unknown: importing app.json widens its plugin entries from
// ExpoConfig's [string, any] tuples to plain arrays, so the two types don't
// overlap enough for a direct assertion. The shape is correct at runtime.
const base = baseConfig.expo as unknown as ExpoConfig;

export default (): ExpoConfig => {
  const appEnv = process.env.APP_ENV;
  const target = appEnv ? ENV_TARGETS[appEnv] : undefined;

  return {
    ...base,
    extra: {
      ...base.extra,
      ...(target ? { appEnv, ...target } : {}),
    },
  };
};
