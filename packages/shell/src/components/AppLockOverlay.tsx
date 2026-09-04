import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

interface AppLockOverlayProps {
  onUnlock: () => void;
  prompting: boolean;
}

/**
 * Opaque cover shown while the app is locked.
 *
 * Rendered ABOVE the live WebView, never in place of it — the same rule as
 * OfflineView. Swapping the WebView out would destroy the web app's JS context
 * and reboot it back to the launch URL, so an unlock would drop the user
 * somewhere other than where they left off. It must be fully opaque so the
 * covered content isn't readable through it.
 */
export function AppLockOverlay({ onUnlock, prompting }: AppLockOverlayProps) {
  // Prompt once on appear. Guarded by a ref rather than an empty-dep effect so a
  // re-render mid-prompt can't stack a second system dialog on top of the first.
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    onUnlock();
  }, [onUnlock]);

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>AI Wellness is locked</Text>

      {prompting ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : (
        <>
          <Text style={styles.message}>Unlock to see your wellness data.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onUnlock}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Unlock</Text>
          </Pressable>
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
    // Fully opaque: this is covering health data.
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: colors.inkMuted,
  },
  spinner: {
    marginTop: 16,
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
