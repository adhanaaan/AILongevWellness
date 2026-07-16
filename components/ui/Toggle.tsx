import React, { useRef, useEffect } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  Animated,
  StyleSheet,
} from "react-native";
import { colors, fontSizes, fontWeights, radii, shadows, spacing } from "@/lib/theme/tokens";

export interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const KNOB_SIZE = 22;
const KNOB_MARGIN = 3;
const TRANSLATE_X = TRACK_WIDTH - KNOB_SIZE - KNOB_MARGIN * 2;

export function Toggle({ checked, onChange, label }: ToggleProps) {
  const animValue = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: checked ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [checked, animValue]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [KNOB_MARGIN, KNOB_MARGIN + TRANSLATE_X],
  });

  const trackBg = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceMuted, colors.teal],
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onChange(!checked)}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[styles.track, { backgroundColor: trackBg }]}
      >
        <Animated.View
          style={[
            styles.knob,
            { transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radii.full,
    justifyContent: "center",
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  label: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.medium,
    color: colors.ink,
  },
});
