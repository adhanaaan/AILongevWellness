import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

export interface ScoreRingProps {
  value: number;
  label: string;
  status: "good" | "monitor";
  size?: number;
}

export function ScoreRing({
  value,
  label,
  status,
  size = 88,
}: ScoreRingProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const strokeDashoffset = circumference * (1 - clamped / 100);
  const progressColor = status === "good" ? colors.sage : colors.terracotta;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.surfaceMuted}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={[styles.valueContainer, { width: size, height: size }]}>
          <Text style={[styles.value, { color: progressColor }]}>{clamped}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  valueContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: fontSizes.headlineMd,
    fontWeight: fontWeights.bold,
  },
  label: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
});
