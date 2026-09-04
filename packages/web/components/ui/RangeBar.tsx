import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, radii } from "@/lib/theme/tokens";

export interface RangeBarProps {
  /** Where the marker sits, in [min, max]. */
  value: number;
  min?: number;
  max?: number;
  /** Start/end of the highlighted healthy band, in [min, max]. */
  zoneStart: number;
  zoneEnd: number;
  /** Healthy-band accent (typically the "optimal" color). Also the marker color unless markerColor is set. */
  color: string;
  /** Marker dot color, when it should differ from the band (e.g. a status color reflecting in/out of the band). */
  markerColor?: string;
  /** Tinted fill for the healthy band. Defaults to a translucent wash of `color`. */
  zoneColor?: string;
  trackColor?: string;
  height?: number;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

// The signature "where do I sit in the healthy range" bar (à la Superpower's
// biomarker rows): a rounded track, a highlighted healthy zone, and a marker
// dot at the value. Deliberately a dumb presentational primitive -- callers
// supply the zone bounds and status color, so it works for pillar scores today
// and individual biomarkers later without change.
export function RangeBar({
  value,
  min = 0,
  max = 100,
  zoneStart,
  zoneEnd,
  color,
  markerColor,
  zoneColor,
  trackColor = colors.surfaceMuted,
  height = 8,
}: RangeBarProps) {
  const span = max - min || 1;
  const toPct = (n: number) => clampPct(((n - min) / span) * 100);

  const valuePct = toPct(value);
  const zoneLeft = toPct(zoneStart);
  const zoneRight = toPct(zoneEnd);
  const zoneWidth = Math.max(0, zoneRight - zoneLeft);

  const dot = height + 8;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <View
        style={[
          styles.zone,
          {
            left: `${zoneLeft}%`,
            width: `${zoneWidth}%`,
            borderRadius: height / 2,
            backgroundColor: zoneColor ?? withAlpha(color, 0.28),
          },
        ]}
      />
      <View
        style={[
          styles.marker,
          {
            left: `${valuePct}%`,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            marginLeft: -dot / 2,
            top: (height - dot) / 2,
            backgroundColor: markerColor ?? color,
          },
        ]}
      />
    </View>
  );
}

// Accepts #RRGGBB (the token palette is all 6-digit hex) and returns an rgba()
// wash. Non-hex inputs are returned untouched so the caller's zoneColor wins.
function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    justifyContent: "center",
  },
  zone: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  marker: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
