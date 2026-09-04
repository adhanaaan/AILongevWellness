import { useCallback, useEffect, useRef, useState } from "react";

/** How long a blank WebView is acceptable before we admit something is wrong. */
const SLOW_LOAD_MS = 8_000;
/** Automatic remounts before we stop and hand the user a Retry button. */
const MAX_ATTEMPTS = 4;

export type WebViewLoadStatus = "loading" | "ready" | "slow" | "failed";

export interface WebViewLoad {
  /**
   * React key for the WebView. Bumping it forces a full NATIVE remount.
   *
   * This is deliberately not `webViewRef.current.reload()`: after the render
   * process is killed, a reload on the recycled process does not reliably re-run
   * `injectedJavaScriptBeforeContentLoaded`. The page would come back looking
   * fine while the injected bridge host, safe-area insets and session hydration
   * silently never re-initialised -- a much worse failure than a visible one.
   */
  key: number;
  status: WebViewLoadStatus;
  onLoadEnd: () => void;
  onLoadError: () => void;
  onCrash: () => void;
  retry: () => void;
}

export function useWebViewLoad(): WebViewLoad {
  const [key, setKey] = useState(0);
  const [status, setStatus] = useState<WebViewLoadStatus>("loading");
  const attempts = useRef(1);

  // One watchdog per mount. Re-arms on every remount via `key`.
  useEffect(() => {
    setStatus("loading");
    const timer = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "slow" : s));
    }, SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, [key]);

  const remount = useCallback(() => {
    if (attempts.current >= MAX_ATTEMPTS) {
      setStatus("failed");
      return;
    }
    attempts.current += 1;
    setKey((k) => k + 1);
  }, []);

  const onLoadEnd = useCallback(() => {
    attempts.current = 1;
    setStatus("ready");
  }, []);

  const retry = useCallback(() => {
    attempts.current = 1;
    setKey((k) => k + 1);
  }, []);

  return { key, status, onLoadEnd, onLoadError: remount, onCrash: remount, retry };
}
