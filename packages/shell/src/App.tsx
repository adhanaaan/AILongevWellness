import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppWebView } from "./components/AppWebView";
import { OfflineView } from "./components/OfflineView";
import { useAppLaunch } from "./hooks/useAppLaunch";
import type { WebViewLoadStatus } from "./hooks/useWebViewLoad";
import { colors } from "./theme";

void SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Shell />
    </SafeAreaProvider>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const launch = useAppLaunch();
  const { markLaunched } = launch;

  const hideSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {
      // Already hidden, or hidden concurrently -- nothing to recover from.
    });
  }, []);

  const onStatusChange = useCallback(
    (status: WebViewLoadStatus) => {
      if (status === "ready") markLaunched();
      hideSplash();
    },
    [markLaunched, hideSplash]
  );

  // The WebView reports its own settle via onStatusChange; the offline screen has
  // no such event, so take the splash down here instead.
  useEffect(() => {
    if (launch.status === "offline") hideSplash();
  }, [launch.status, hideSplash]);

  if (launch.status === "offline") {
    return <OfflineView onRetry={launch.retry} />;
  }

  if (launch.status === "launching" && launch.webViewUrl) {
    return (
      // The WebView is inset rather than edge-to-edge, and the surrounding band
      // is painted the app's own background colour so the seam is invisible.
      //
      // This is deliberate: env(safe-area-inset-*) reads 0 inside a WKWebView
      // (gated by contentInsetAdjustmentBehavior) and is never populated at all
      // in Android's embedded WebView -- and react-native-safe-area-context, which
      // the web app uses in 19 files, measures those env() values from a hidden
      // element and overwrites any initialMetrics we could pass. So the web app
      // cannot be told the real insets without native injection. Padding here
      // means it correctly measures zero and needs no changes at all.
      //
      // Going truly edge-to-edge later means injecting window.__NATIVE_INSETS__
      // and swapping SafeAreaProvider for direct context providers in
      // packages/web's app/_layout.tsx.
      <View
        style={[
          styles.frame,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <AppWebView webViewUrl={launch.webViewUrl} onStatusChange={onStatusChange} />
      </View>
    );
  }

  // "checking" -- connectivity not yet resolved. The splash is still up, so this
  // is only visible if the splash was dismissed early.
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
