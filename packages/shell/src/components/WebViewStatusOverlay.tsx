import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

interface WebViewStatusOverlayProps {
  variant: "slow" | "failed";
  onRetry: () => void;
}

/**
 * Covers the WebView while it is taking too long or has given up. Rendered on
 * top of the live WebView rather than in place of it, so recovery never
 * unmounts the web app's JS context.
 */
export function WebViewStatusOverlay({ variant, onRetry }: WebViewStatusOverlayProps) {
  const isFailed = variant === "failed";

  return (
    <View style={styles.overlay}>
      {isFailed ? (
        <>
          <Text style={styles.title}>Couldn&rsquo;t load</Text>
          <Text style={styles.message}>
            Something went wrong reaching AI Wellness. Please try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>Still loading&hellip;</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 8,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: colors.inkMuted,
  },
  button: {
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 36,
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
