import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { AVA_DISCLAIMER } from "@/lib/ava/constants";
import {
  colors,
  fontFamilies,
  fontSizes,
  fontWeights,
  radii,
  shadows,
  spacing,
} from "@/lib/theme/tokens";

const DOTS = [0, 1, 2];

export function TypingIndicator() {
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslate = useRef(new Animated.Value(6)).current;
  const dots = useRef(DOTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(enterTranslate, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, {
            toValue: 1,
            duration: 420,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 420,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay((DOTS.length - 1 - i) * 160),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [enterOpacity, enterTranslate, dots]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity: enterOpacity, transform: [{ translateY: enterTranslate }] },
      ]}
    >
      <View style={styles.bubble}>
        <View style={styles.row}>
          <View style={styles.dotsRow}>
            {dots.map((dot, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    opacity: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.35, 1],
                    }),
                    transform: [
                      {
                        translateY: dot.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1.5, -2.5],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.label}>AVA is thinking</Text>
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
    borderRadius: radii["2xl"],
    borderBottomLeftRadius: radii.sm,
    paddingVertical: spacing.md + 1,
    paddingHorizontal: spacing.lg,
    maxWidth: "84%",
    ...shadows.soft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.sage,
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.medium,
    color: colors.inkMuted,
    letterSpacing: -0.1,
  },
  disclaimer: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
});
