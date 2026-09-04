import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

/**
 * Biometric app lock (Face ID / Touch ID / fingerprint).
 *
 * Two reasons this exists. It is genuinely appropriate for an app holding lab
 * results and biological-age scores on a phone that gets handed around. And it
 * is the clearest remaining signal to an App Store reviewer that this is an app
 * rather than a website in a wrapper — guideline 4.2 — which only works because
 * the toggle is user-visible in Settings.
 *
 * The enabled flag lives in SecureStore rather than being passed down from the
 * web app: the lock must be enforceable before the WebView has loaded anything,
 * including on a cold start, so its state cannot depend on web storage (which
 * WebKit can evict anyway).
 */

const ENABLED_KEY = "aiw.applock.enabled";

export interface LockCapabilities {
  supported: boolean;
  enrolled: boolean;
  enabled: boolean;
}

export async function getLock(): Promise<LockCapabilities> {
  try {
    const [supported, enrolled, stored] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      SecureStore.getItemAsync(ENABLED_KEY),
    ]);

    // Report enabled only while it is actually enforceable. If the user removes
    // their biometric enrolment in system settings, a stored `true` would leave
    // the app claiming to be locked while every unlock attempt fails.
    const enabled = stored === "true" && supported && enrolled;
    return { supported, enrolled, enabled };
  } catch {
    return { supported: false, enrolled: false, enabled: false };
  }
}

export async function setLock(params: { enabled: boolean }): Promise<{ enabled: boolean }> {
  if (!params.enabled) {
    await SecureStore.deleteItemAsync(ENABLED_KEY).catch(() => {});
    return { enabled: false };
  }

  const { supported, enrolled } = await getLock();
  if (!supported || !enrolled) return { enabled: false };

  // Prove the biometric works before committing, so enabling can't lock the user
  // out of their own app on the next launch.
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Confirm to turn on app lock",
    disableDeviceFallback: false,
  });
  if (!result.success) return { enabled: false };

  await SecureStore.setItemAsync(ENABLED_KEY, "true");
  return { enabled: true };
}

/** Prompts for unlock. Used by the lock overlay, not over the bridge. */
export async function authenticate(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock AI Wellness",
      // Passcode fallback stays available on purpose: a failed fingerprint must
      // not permanently strand someone out of their own health data.
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

/** Whether the lock should be enforced right now, read natively at launch. */
export async function isLockEnabled(): Promise<boolean> {
  return (await getLock()).enabled;
}
