import React from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

export interface GradientStop {
  offset: string;
  color: string;
}

export interface GradientOverlayProps {
  /** Ordered top-to-bottom color stops, e.g. transparent center fading to dark top/bottom. */
  stops: GradientStop[];
  style?: ViewStyle;
}

/**
 * Full-bleed vertical gradient overlay, used atop video/image backgrounds
 * so foreground text stays legible regardless of what's underneath.
 */
export function GradientOverlay({ stops, style }: GradientOverlayProps) {
  return (
    <Svg style={[styles.fill, style]} pointerEvents="none">
      <Defs>
        <LinearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
          {stops.map((stop, i) => (
            <Stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#overlay)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
});
