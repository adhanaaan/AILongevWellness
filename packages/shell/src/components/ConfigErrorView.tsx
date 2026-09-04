import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme";

/**
 * Shown instead of the WebView when a release build would load the unconfirmed
 * placeholder URL.
 *
 * The failure this prevents is silent: a store build pointing at the wrong
 * environment looks completely normal, so it would reach review — and possibly
 * users — before anyone noticed. Naming the file to fix makes it a two-minute
 * problem instead of a mystery.
 */
export function ConfigErrorView() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>This build is misconfigured</Text>
      <Text style={styles.message}>
        No production URL has been set, so there is nothing to load.
      </Text>
      <Text style={styles.path}>packages/shell/src/config.ts</Text>
      <Text style={styles.message}>
        Set PLACEHOLDER_WEB_APP_URL to the real deployment, or point the build&rsquo;s EAS
        profile at one, then rebuild.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: colors.inkMuted,
  },
  path: {
    fontFamily: "Courier",
    fontSize: 14,
    color: colors.ink,
    marginVertical: 16,
  },
});
