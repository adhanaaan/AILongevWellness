import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

export interface ProgressRingProps {
  /** 0–1 completion. Clamped. */
  fraction: number;
  size?: number;
  stroke?: number;
  /** Gradient endpoints for the progress arc (leading edge = `to`). */
  from: string;
  to: string;
  trackColor: string;
  /** Centered content (a count, an icon) rendered in the ring well. */
  children?: React.ReactNode;
  /** Screen-reader label. Defaults to a "N% complete" summary of `fraction`. */
  accessibilityLabel?: string;
}

// A generic gradient progress ring with a faint track underneath and arbitrary
// centered content — shared by the Care Plan "Today" hero (on navy) and the
// per-category tracked-metric header (on light). Kept separate from ScoreRing,
// which is specialized for a 0–100 score with a status color and a label below.
export function ProgressRing({
  fraction,
  size = 104,
  stroke = 9,
  from,
  to,
  trackColor,
  children,
  accessibilityLabel,
}: ProgressRingProps) {
  // useId() strings contain colons which break svg url(#id) refs; strip them.
  const gradientId = React.useId().replace(/:/g, "");
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, fraction));
  const dashoffset = circumference * (1 - clamped);

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `${Math.round(clamped * 100)}% complete`}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
