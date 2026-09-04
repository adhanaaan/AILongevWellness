import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/lib/theme/tokens";

/**
 * Every data screen used to just `return null` while its first fetch was in
 * flight -- a blank white flash, not a loading state. This is the shared
 * fill-in: centered, brand-colored, no layout jump when the real content
 * swaps in since it fills the same space the content will occupy.
 */
export function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.sageDark} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
