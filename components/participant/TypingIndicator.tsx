import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Loader2 } from "lucide-react-native";
import { AVA_DISCLAIMER } from "@/lib/ava/constants";
import {
  colors,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@/lib/theme/tokens";

export function TypingIndicator() {
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [enterOpacity, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.wrapper, { opacity: enterOpacity }]}>
      <View style={styles.bubble}>
        <View style={styles.row}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Loader2 size={16} color={colors.inkMuted} />
          </Animated.View>
          <Text style={styles.label}>Thinking...</Text>
        </View>
        <Text style={styles.disclaimer}>{AVA_DISCLAIMER}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  bubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderBottomLeftRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    maxWidth: "80%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.medium,
    color: colors.charcoal,
  },
  disclaimer: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
});
