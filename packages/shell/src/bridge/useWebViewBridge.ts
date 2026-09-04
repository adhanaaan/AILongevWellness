import { useNetInfo } from "@react-native-community/netinfo";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

import {
  BridgeCore,
  NATIVE_HOST_FLAG,
  PROTOCOL_VERSION,
  WEB_RECEIVER_GLOBAL,
  type BootConfig,
  type NativePlatform,
} from "@aiw/shared/bridge";

import { cancelDaily, requestPermission, scheduleDaily } from "./handlers/notifications";
import { getLock, setLock } from "./handlers/security";
import { clearSession, getSession, setSession } from "./handlers/session";
import { createSystemHandlers } from "./handlers/system";

/**
 * Runs before any page script, so the web app's very first tick can tell it is
 * inside the shell. It keys off this rather than off `window.ReactNativeWebView`
 * because that global is injected by react-native-webview itself and, while
 * normally present first, loses the race on some cold loads -- and losing it
 * means booting in browser mode and never wiring the bridge at all.
 */
export const BEFORE_CONTENT_JS = `window.${NATIVE_HOST_FLAG} = true; true;`;

/**
 * JSON.stringify gets us most of the way to a JS string literal, but U+2028 and
 * U+2029 are legal inside a JSON string while TERMINATING a JavaScript string
 * literal -- so a session or profile field containing one would blow up inside
 * injectJavaScript as a syntax error rather than surface as a caught failure.
 *
 * Written as \\u escapes rather than the literal characters: they are invisible
 * in an editor, and a regex whose contents cannot be seen is a trap.
 */
function toJsStringLiteral(value: string): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export interface WebViewBridge {
  handleMessage: (event: WebViewMessageEvent) => void;
  /** Ask the web app to handle Android back. Resolves false if it didn't. */
  requestBack: () => Promise<boolean>;
  /** Drop in-flight requests when the WebView is about to be remounted. */
  reset: (reason: string) => void;
}

export function useWebViewBridge(webViewRef: React.RefObject<WebView | null>): WebViewBridge {
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetInfo();

  // Kept in refs so the handlers registered once below always read current
  // values without needing to be re-registered on every inset change.
  const insetsRef = useRef(insets);
  insetsRef.current = insets;

  const core = useMemo(
    () =>
      new BridgeCore({
        origin: "n",
        send: (serialized) => {
          const webView = webViewRef.current;
          if (!webView) throw new Error("WebView is not mounted");
          webView.injectJavaScript(
            `window.${WEB_RECEIVER_GLOBAL} && window.${WEB_RECEIVER_GLOBAL}(${toJsStringLiteral(serialized)}); true;`
          );
        },
        onError: (error, context) => {
          if (error.code !== "TIMEOUT" && error.code !== "NOT_READY") {
            console.warn(`[bridge] ${error.code}: ${error.message}`, context);
          }
        },
      }),
    [webViewRef]
  );

  // Handlers are registered once. Everything they need that changes over time is
  // read through a ref, so re-registering is never necessary.
  useEffect(() => {
    const system = createSystemHandlers({
      emitDeepLink: (payload) => core.emit("navigation:deep-link", payload),
    });

    core.setHandler("bridge:init", (): BootConfig => {
      return {
        protocolVersion: PROTOCOL_VERSION,
        platform: Platform.OS as NativePlatform,
        appVersion: Constants.expoConfig?.version ?? "unknown",
        insets: insetsRef.current,
        // Session is NOT read here: bridge:init must stay fast because the web
        // app blocks its first render on it, and a keychain read after a cold
        // boot can be slow. The web app asks for it separately.
        session: null,
      };
    });

    core.setHandler("session:get", async () => ({ value: await getSession() }));
    core.setHandler("session:set", async (p: { value: string }) => {
      await setSession(p.value);
      return { ok: true as const };
    });
    core.setHandler("session:clear", async () => {
      await clearSession();
      return { ok: true as const };
    });

    core.setHandler("notifications:permission", () => requestPermission());
    core.setHandler("notifications:scheduleDaily", (p: Parameters<typeof scheduleDaily>[0]) =>
      scheduleDaily(p)
    );
    core.setHandler("notifications:cancel", () => cancelDaily());

    core.setHandler("security:getLock", () => getLock());
    core.setHandler("security:setLock", (p: { enabled: boolean }) => setLock(p));

    core.setHandler("system:open-external", (p: { url: string; returnTo?: string }) =>
      system.openExternal(p)
    );
  }, [core]);

  // Connectivity changes are forwarded rather than acted on natively: the
  // WebView must stay mounted through a drop (unmounting destroys the web app's
  // JS context), so the web app renders its own in-place offline state.
  const lastConnected = useRef<boolean | null>(null);
  useEffect(() => {
    if (isConnected === null || isConnected === lastConnected.current) return;
    lastConnected.current = isConnected;
    core.emit("connectivity:changed", { isConnected });
  }, [core, isConnected]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") core.emit("app:resumed", {});
    });
    return () => sub.remove();
  }, [core]);

  // Insets resolve asynchronously on some Android devices, so the value captured
  // at first render can be zeros. Push updates as they settle.
  useEffect(() => {
    core.emit("insets:changed", insets);
  }, [core, insets]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => core.receive(event.nativeEvent.data),
    [core]
  );

  const requestBack = useCallback(async () => {
    try {
      const result = await core.request<{ handled: boolean }>("navigation:back", {}, 1_000);
      return result.handled;
    } catch {
      // Old shell/web pairing, or the web app is wedged. Falling back to "not
      // handled" lets Android close the app, which is the safer failure: the
      // alternative is a back button that does nothing at all.
      return false;
    }
  }, [core]);

  const reset = useCallback((reason: string) => core.reset(reason), [core]);

  return { handleMessage, requestBack, reset };
}
