import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Linking, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { APP_ORIGIN } from "../config";
import { BEFORE_CONTENT_JS, useWebViewBridge } from "../bridge/useWebViewBridge";
import { useAppLock } from "../hooks/useAppLock";
import { useWebViewLoad, type WebViewLoadStatus } from "../hooks/useWebViewLoad";
import { colors } from "../theme";
import { AppLockOverlay } from "./AppLockOverlay";
import { WebViewStatusOverlay } from "./WebViewStatusOverlay";

interface AppWebViewProps {
  webViewUrl: string;
  /**
   * Called whenever the load settles into a non-transient state. The host uses
   * this both to mark a successful launch and to take the splash screen down --
   * including on "slow"/"failed", so a stuck load surfaces its own retry UI
   * instead of hiding behind the splash forever.
   */
  onStatusChange: (status: WebViewLoadStatus) => void;
}

/** Schemes we hand to the OS rather than trying to render. */
const EXTERNAL_SCHEMES = ["mailto:", "tel:", "sms:", "market:", "itms-apps:"];

export function AppWebView({ webViewUrl, onStatusChange }: AppWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const load = useWebViewLoad();
  const bridge = useWebViewBridge(webViewRef);
  const lock = useAppLock();

  useEffect(() => {
    if (load.status !== "loading") onStatusChange(load.status);
  }, [load.status, onStatusChange]);

  // A remount gives the page a fresh JS context, so nothing in flight can ever
  // be answered. Fail those requests now rather than leaving callers hanging
  // until their individual timeouts.
  const { reset } = bridge;
  const remountKey = load.key;
  useEffect(() => {
    return () => reset("WebView remounting");
  }, [remountKey, reset]);

  // Android hardware back is resolved by the WEB app, not by WebView history.
  // The web app navigates with expo-router's router.replace() in places, which
  // pushes no history entry -- so webViewRef.goBack() would skip screens or exit
  // the app early. Only the web app knows where back should actually go.
  const { requestBack } = bridge;
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      // BackHandler needs a synchronous answer, but the web app's is a round
      // trip -- so always claim the press and decide afterwards. requestBack
      // resolves false on timeout, so a wedged web app still exits rather than
      // trapping the user with a dead back button.
      void requestBack().then((handled) => {
        if (!handled) BackHandler.exitApp();
      });
      return true;
    });
    return () => sub.remove();
  }, [requestBack]);

  /**
   * Keeps our own origin in the WebView and pushes everything else out to the
   * OS. A safety net, not the mechanism: on Android this maps to
   * shouldOverrideUrlLoading, which is NOT reliably called for JS-initiated
   * navigation without a user gesture. Deliberate outbound navigation (Terra's
   * OAuth) goes over the bridge's system:open-external instead.
   */
  const onShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
    const { url } = request;

    if (url.startsWith(APP_ORIGIN) || url === "about:blank" || url.startsWith("data:")) {
      return true;
    }
    if (EXTERNAL_SCHEMES.some((scheme) => url.startsWith(scheme))) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    // Anything else (including plain http:) does not render in-app, so a
    // third-party page can never silently occupy our shell.
    return false;
  }, []);

  return (
    <View style={styles.fill}>
      <WebView
        key={load.key}
        ref={webViewRef}
        source={{ uri: webViewUrl }}
        style={styles.webview}
        originWhitelist={[`${APP_ORIGIN}/*`]}
        // Scroll inside elements only. react-native-web renders ScrollView as an
        // overflow:auto div, so the app still scrolls normally -- but leaving the
        // outer WebView scrollable gives a double scroll and lets the fixed tab
        // bar drift out of view when the keyboard opens.
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // The app has no in-WebView back affordance; swipe-back would strand the
        // user on a previous page while the app's own nav state moved on.
        allowsBackForwardNavigationGestures={false}
        // Route target=_blank through onShouldStartLoadWithRequest instead of
        // letting Android silently swallow it.
        setSupportMultipleWindows={false}
        injectedJavaScriptBeforeContentLoaded={BEFORE_CONTENT_JS}
        // Sub-frames too: an iframe (the admin file preview renders one) that
        // can't see the host flag would try to boot in browser mode.
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
        onMessage={bridge.handleMessage}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onLoadEnd={load.onLoadEnd}
        onError={load.onLoadError}
        onHttpError={({ nativeEvent }) =>
          console.error("WebView HTTP error", nativeEvent.statusCode, nativeEvent.url)
        }
        onContentProcessDidTerminate={load.onCrash}
        onRenderProcessGone={load.onCrash}
      />
      {(load.status === "slow" || load.status === "failed") && (
        <WebViewStatusOverlay variant={load.status} onRetry={load.retry} />
      )}
      {/* Last child, so it covers the status overlay too -- a locked app must not
          leak anything, including which screen was open behind it. */}
      {lock.locked && <AppLockOverlay onUnlock={lock.unlock} prompting={lock.prompting} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.background },
});
