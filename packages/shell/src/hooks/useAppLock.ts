import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { authenticate, isLockEnabled } from "../bridge/handlers/security";

/**
 * How long the app may sit in the background before it re-locks.
 *
 * Without a grace period the lock fires every time the user glances at another
 * app — or, worse, every time the system briefly backgrounds us during the file
 * picker or an OAuth sheet, which would interrupt those flows mid-way.
 */
const GRACE_MS = 30_000;

export interface AppLock {
  /** True while the lock screen should cover the app. */
  locked: boolean;
  /** Attempt an unlock; safe to call repeatedly. */
  unlock: () => void;
  /** True while a biometric prompt is on screen. */
  prompting: boolean;
}

export function useAppLock(): AppLock {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [prompting, setPrompting] = useState(false);

  const backgroundedAt = useRef<number | null>(null);
  const enabledRef = useRef(false);
  enabledRef.current = enabled;

  // Read at launch, and lock immediately if it's on -- a cold start must be
  // gated before the WebView shows anything.
  useEffect(() => {
    let active = true;
    void isLockEnabled().then((on) => {
      if (!active) return;
      setEnabled(on);
      if (on) setLocked(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const unlock = useCallback(() => {
    setPrompting(true);
    void authenticate().then((ok) => {
      setPrompting(false);
      if (ok) setLocked(false);
      // On failure we stay locked and the overlay offers a retry. Never
      // auto-unlock -- that would make the lock decorative.
    });
  }, []);

  useEffect(() => {
    function onChange(next: AppStateStatus) {
      if (next === "active") {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (enabledRef.current && since !== null && Date.now() - since > GRACE_MS) {
          setLocked(true);
        }
        return;
      }
      // "inactive" fires for transient interruptions too (notification shade,
      // incoming call), so only start the clock once, on the first non-active
      // state, and let "active" clear it.
      if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
    }

    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  // The web app can turn the lock on or off at any time via the bridge, so
  // re-read whenever we come back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void isLockEnabled().then(setEnabled);
    });
    return () => sub.remove();
  }, []);

  return { locked, unlock, prompting };
}
