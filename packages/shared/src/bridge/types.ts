/**
 * The web<->native contract.
 *
 * Both sides are versioned independently: packages/web redeploys instantly on
 * every push, while packages/shell ships through App Store / Play review and
 * then lingers on users' devices for months. So a NEWER web app talking to an
 * OLDER shell is the normal case, not an edge case.
 *
 * Consequences for anything added here:
 *   - Never remove or repurpose a method. Add a new one.
 *   - Never make an existing request's params stricter.
 *   - The web side must degrade gracefully when a method is unimplemented --
 *     `UNSUPPORTED` is a routine answer from an old shell, not an error worth
 *     reporting.
 */
export const PROTOCOL_VERSION = 1;

export type NativePlatform = "ios" | "android";

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Everything the web app needs at boot, answered in one round-trip. */
export interface BootConfig {
  protocolVersion: number;
  platform: NativePlatform;
  /** The shell's own version, for diagnostics — NOT the web app's. */
  appVersion: string;
  insets: SafeAreaInsets;
  /**
   * The persisted Supabase session, verbatim, or null. Handed over at boot so
   * the web app can seed its auth storage synchronously rather than making
   * every supabase-js storage read a bridge round-trip.
   */
  session: string | null;
}

/** Requests the web app makes of the shell. */
export interface WebToNativeRequests {
  "bridge:init": { params: { protocolVersion: number }; result: BootConfig };

  "session:get": { params: Record<string, never>; result: { value: string | null } };
  "session:set": { params: { value: string }; result: { ok: true } };
  "session:clear": { params: Record<string, never>; result: { ok: true } };

  "notifications:permission": { params: Record<string, never>; result: { granted: boolean } };
  "notifications:scheduleDaily": {
    params: { hour: number; minute: number; title: string; body: string };
    result: { scheduled: boolean };
  };
  "notifications:cancel": { params: Record<string, never>; result: { ok: true } };

  /**
   * Biometric app lock. `supported` is whether the hardware exists, `enrolled`
   * whether the user has actually set up Face ID / a fingerprint — both are
   * needed, since offering the toggle on a device with no enrolled biometric
   * would produce a switch that silently refuses to turn on.
   */
  "security:getLock": {
    params: Record<string, never>;
    result: { supported: boolean; enrolled: boolean; enabled: boolean };
  };
  /** Returns the resulting state, which is `false` if enabling was refused. */
  "security:setLock": { params: { enabled: boolean }; result: { enabled: boolean } };

  /**
   * Open a URL outside the WebView, in a real browser
   * (ASWebAuthenticationSession / Custom Tabs).
   *
   * Not a nicety: identity providers reject OAuth attempted inside an embedded
   * WebView (Google returns `disallowed_useragent`), so the Terra connect flow
   * cannot complete in-app. `returnTo` is the web route to land on afterwards,
   * delivered back as a `navigation:deep-link` event.
   */
  "system:open-external": { params: { url: string; returnTo?: string }; result: { ok: true } };
}

/** Requests the shell makes of the web app. */
export interface NativeToWebRequests {
  /**
   * Android hardware back. The web app answers whether it consumed the press;
   * `false` lets Android close the app.
   *
   * Asked rather than resolved natively because the web app navigates with
   * expo-router's router.replace() in places, which pushes no history entry —
   * so WebView history is not a faithful model of where "back" should go.
   */
  "navigation:back": { params: Record<string, never>; result: { handled: boolean } };
}

/** Fire-and-forget messages from the shell to the web app. */
export interface NativeToWebEvents {
  "navigation:deep-link": { path: string; params: Record<string, string> };
  "connectivity:changed": { isConnected: boolean };
  "app:resumed": Record<string, never>;
  "insets:changed": SafeAreaInsets;
}

export type WebToNativeMethod = keyof WebToNativeRequests;
export type NativeToWebMethod = keyof NativeToWebRequests;
export type NativeToWebEvent = keyof NativeToWebEvents;

export type BridgeErrorCode =
  /** No reply within the timeout. Routine — assume the shell is busy or old. */
  | "TIMEOUT"
  /** Bridge not connected (plain browser, or handshake not finished). */
  | "NOT_READY"
  /** The other side doesn't implement this method — expect it from old shells. */
  | "UNSUPPORTED"
  /** The handler ran and threw. */
  | "HANDLER_ERROR";

export interface BridgeError {
  code: BridgeErrorCode;
  message: string;
}
