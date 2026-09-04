import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme";

interface OfflineViewProps {
  onRetry: () => void;
}

export function OfflineView({ onRetry }: OfflineViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>You&rsquo;re offline</Text>
      <Text style={styles.message}>
        AI Wellness needs a connection to load your insights. Check your network and try again.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
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
    marginBottom: 8,
  },
  message: {
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
