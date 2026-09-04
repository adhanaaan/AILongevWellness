import { useCallback, useEffect, useState } from "react";

import { getPlatform } from "./init";

/**
 * Biometric app lock, exposed as a Settings toggle.
 *
 * Only meaningful inside the native shell — a browser has no Face ID. The shell
 * owns the actual state (in SecureStore) because the lock has to be enforceable
 * before the WebView has loaded, including on a cold start; this hook is just
 * the control surface.
 *
 * Mirrors useDailyReminder's shape deliberately: both are native capabilities
 * surfaced as one row in Settings, and keeping them structurally identical means
 * the next one is obvious to add.
 */

export interface AppLock {
  /** False in a browser, or on a device with no usable biometric — hide the row. */
  available: boolean;
  enabled: boolean;
  /** True when the device has the hardware but the user hasn't enrolled a biometric. */
  notEnrolled: boolean;
  setEnabled: (next: boolean) => void;
}

export function useAppLock(): AppLock {
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    const { bridge } = getPlatform();
    if (!bridge) return;

    let active = true;
    bridge
      .request("security:getLock", {})
      .then((state) => {
        if (!active) return;
        setSupported(state.supported);
        setEnrolled(state.enrolled);
        setEnabledState(state.enabled);
      })
      .catch(() => {
        // A shell build predating this method answers UNSUPPORTED. That's the
        // designed degradation, not an error -- leave the row hidden.
      });

    return () => {
      active = false;
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    const { bridge } = getPlatform();
    if (!bridge) return;

    // Optimistic, then corrected by the real answer: enabling requires a
    // successful biometric prompt, which the user can cancel.
    setEnabledState(next);
    bridge
      .request("security:setLock", { enabled: next })
      .then((result) => setEnabledState(result.enabled))
      .catch(() => setEnabledState(false));
  }, []);

  return {
    // Hardware without an enrolled biometric can't lock anything, so the row
    // still shows (to explain why) but the switch would refuse -- see notEnrolled.
    available: supported,
    enabled,
    notEnrolled: supported && !enrolled,
    setEnabled,
  };
}
