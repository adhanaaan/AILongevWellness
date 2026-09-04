import { useNetInfo } from "@react-native-community/netinfo";
import { useCallback, useEffect, useRef, useState } from "react";

import { config } from "../config";

export type LaunchStatus = "checking" | "offline" | "launching";

export interface AppLaunch {
  status: LaunchStatus;
  /** WebView URL to load — present once status === "launching". */
  webViewUrl: string | null;
  /** Call once the web app has actually loaded, to mark the launch successful. */
  markLaunched: () => void;
  /** Re-check connectivity (from the offline screen). */
  retry: () => void;
}

/**
 * Drives launch: wait until connectivity is *known*, then either show the
 * offline screen or start the WebView.
 */
export function useAppLaunch(): AppLaunch {
  const { isConnected } = useNetInfo();
  const [status, setStatus] = useState<LaunchStatus>("checking");
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const launchedRef = useRef(false);

  useEffect(() => {
    // Connectivity gates the INITIAL launch only. Once the WebView is up it must
    // stay mounted: swapping in OfflineView unmounts it and destroys its JS
    // context, so a brief drop -- routine after unlocking the phone, or on a
    // WiFi/cellular handoff -- would reboot the entire web app and throw the
    // user back to the launch URL mid-flow. Later drops are forwarded to the web
    // app over the bridge instead, and it renders its own in-place offline UI.
    if (launchedRef.current) return;

    if (isConnected === false) {
      setStatus("offline");
      return;
    }
    // null = not yet known. Never start a load that's doomed to fail.
    if (isConnected === null) return;

    setWebViewUrl(config.webAppUrl);
    setStatus("launching");
  }, [isConnected, retryNonce]);

  const markLaunched = useCallback(() => {
    launchedRef.current = true;
  }, []);

  const retry = useCallback(() => {
    setStatus("checking");
    setRetryNonce((n) => n + 1);
  }, []);

  return { status, webViewUrl, markLaunched, retry };
}
