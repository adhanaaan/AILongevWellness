import { useEffect, useState } from "react";
import { parseSessionMap, type BootConfig } from "@aiw/shared/bridge";

import { createBridgeStorage, type SupabaseStorageLike } from "./bridgeStorage";
import { NativeBridge } from "./nativeBridge";

/**
 * Decides once, at boot, whether we are running inside the native shell, and if
 * so wires up everything that has to exist before the Supabase client is
 * constructed.
 *
 * The ordering matters: supabase-js takes its auth `storage` at createClient()
 * time, so the bridge must be resolved before the first getSupabaseClient()
 * call. That is only possible because lib/data/mock.ts resolves the repository
 * lazily -- it used to build the client during module evaluation, before React
 * rendered at all.
 */

export interface PlatformState {
  isNative: boolean;
  bridge: NativeBridge | null;
  boot: BootConfig | null;
  /** Passed straight to createClient's auth.storage. undefined = browser default. */
  storage: SupabaseStorageLike | undefined;
}

const WEB_ONLY: PlatformState = { isNative: false, bridge: null, boot: null, storage: undefined };

let state: PlatformState = WEB_ONLY;
let initPromise: Promise<PlatformState> | null = null;
let resolved = false;

/** Synchronous accessor. Safe before init — reports plain-web until proven otherwise. */
export function getPlatform(): PlatformState {
  return state;
}

export function isNativeShell(): boolean {
  return state.isNative;
}

/** Idempotent. Concurrent callers share one initialization. */
export function initPlatform(): Promise<PlatformState> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const available = await NativeBridge.waitForAvailability();
    if (!available) return WEB_ONLY;

    const bridge = new NativeBridge();
    const boot = await bridge.init();

    // Handshake failed or timed out. Fall through to normal web behaviour --
    // localStorage, no native features -- rather than leaving the app wedged on
    // a blank screen. A degraded app beats an unusable one.
    if (!boot) return WEB_ONLY;

    let seed: Record<string, string> = {};
    try {
      const { value } = await bridge.request("session:get", {});
      seed = parseSessionMap(value);
    } catch {
      // Old shell without session support, or the keychain is unavailable.
      // Starting empty just means the user signs in again.
    }

    return {
      isNative: true,
      bridge,
      boot,
      storage: createBridgeStorage(bridge, seed),
    } satisfies PlatformState;
  })().then((next) => {
    state = next;
    resolved = true;
    return next;
  });

  return initPromise;
}

/**
 * Gates first render on {@link initPlatform}. Returns true in a plain browser
 * within a few hundred ms, and immediately on subsequent mounts.
 */
export function usePlatformInit(): boolean {
  // Already resolved on a remount (React Navigation keeps tab screens mounted,
  // and Fast Refresh re-runs this) -- don't flash a blank frame again.
  const [ready, setReady] = useState(() => resolved);

  useEffect(() => {
    let active = true;
    initPlatform()
      .catch(() => WEB_ONLY)
      .then(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return ready;
}
