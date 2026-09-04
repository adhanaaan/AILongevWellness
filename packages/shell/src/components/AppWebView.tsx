import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Linking, Platform, StyleSheet, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { APP_ORIGIN } from "../config";
import { useWebViewLoad, type WebViewLoadStatus } from "../hooks/useWebViewLoad";
import { colors } from "../theme";
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
  const canGoBack = useRef(false);
  const load = useWebViewLoad();

  useEffect(() => {
    if (load.status !== "loading") onStatusChange(load.status);
  }, [load.status, onStatusChange]);

  // Android hardware back. Interim implementation: this walks WebView history,
  // which is not quite right because the web app uses expo-router's
  // router.replace() in several places (app/index.tsx, useChannelUpload.leave()),
  // and a replace pushes no history entry -- so back can skip a screen or exit
  // the app earlier than the user expects. Phase 3 replaces this with a bridge
  // request that lets the web app resolve its own canGoBack from expo-router.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack.current) return false; // let Android close the app
      webViewRef.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    canGoBack.current = nav.canGoBack;
  }, []);

  /**
   * Keeps our own origin in the WebView and pushes everything else out to the
   * OS. A safety net, not the mechanism: on Android this maps to
   * shouldOverrideUrlLoading, which is NOT reliably called for JS-initiated
   * navigation without a user gesture. Deliberate outbound navigation (Terra's
   * OAuth) goes over the bridge in Phase 4 instead of relying on this.
   */
  const onShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
    const { url } = request;

    if (url.startsWith(APP_ORIGIN) || url === "about:blank" || url.startsWith("data:")) {
      return true;
    }
    if (EXTERNAL_SCHEMES.some((scheme) => url.startsWith(scheme))) {
      void Linking.openURL(url).catch(() => {});
      return false;
    }
    // Anything else (including plain http:) does not render in-app. Phase 4
    // routes https: to expo-web-browser; until then it is simply blocked rather
    // than silently loading a third-party page inside our shell.
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
        onNavigationStateChange={onNavigationStateChange}
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
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.background },
});
