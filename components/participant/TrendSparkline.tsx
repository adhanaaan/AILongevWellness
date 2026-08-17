import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Line, Circle, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors, radii } from "@/lib/theme/tokens";

export interface TrendSparklineProps {
  /** Chronological values, oldest first. Needs >= 2 to draw a line. */
  values: number[];
  /** Optional matching timestamps (ms) so points space by real elapsed time, à la Oura. Falls back to even spacing. */
  timestamps?: number[];
  /** Line + fill hue (pillar color or sage), from tokens only. */
  color: string;
  /** Optional healthy reference band, drawn as a faint horizontal zone behind the line. */
  refLow?: number | null;
  refHigh?: number | null;
  width?: number;
  height?: number;
}

// A calm-clinical sparkline: one thin line over a soft, low-opacity area fill,
// a single highlighted latest point, a 1-line baseline, and (optionally) a
// faint healthy-range band for context. No gridlines, no axes -- restrained,
// Oura-style. Pure react-native-svg; all color comes from design tokens.
export function TrendSparkline({
  values,
  timestamps,
  color,
  refLow,
  refHigh,
  width = 260,
  height = 88,
}: TrendSparklineProps) {
  const gradientId = React.useId();
  const padX = 6;
  const padY = 12;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const baselineY = height - padY;

  // Domain spans the data and, when present, the reference band so the healthy
  // zone stays visible even if every reading sits inside (or outside) it.
  const domainVals = [...values];
  if (refLow != null) domainVals.push(refLow);
  if (refHigh != null) domainVals.push(refHigh);
  let minY = Math.min(...domainVals);
  let maxY = Math.max(...domainVals);
  if (maxY === minY) {
    // Flat series: give it a little breathing room so the line sits mid-band.
    const nudge = Math.abs(maxY) * 0.1 || 1;
    minY -= nudge;
    maxY += nudge;
  }
  const span = maxY - minY;

  const yFor = (v: number) => padY + (1 - (v - minY) / span) * innerH;

  // X spaces by real elapsed time when timestamps are supplied and cover a
  // range; otherwise even spacing. Honest about uneven gaps between readings.
  const useTime =
    !!timestamps &&
    timestamps.length === values.length &&
    Math.max(...timestamps) > Math.min(...timestamps);
  const tMin = useTime ? Math.min(...(timestamps as number[])) : 0;
  const tSpan = useTime ? Math.max(...(timestamps as number[])) - tMin : 1;
  const xFor = (i: number) => {
    if (useTime) {
      return padX + ((timestamps as number[])[i] - tMin) / tSpan * innerW;
    }
    return values.length === 1 ? padX + innerW / 2 : padX + (i / (values.length - 1)) * innerW;
  };

  const pts = values.map((v, i) => ({ x: xFor(i), y: yFor(v) }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${baselineY} L ${pts[0].x.toFixed(1)} ${baselineY} Z`;

  const hasBand = refLow != null && refHigh != null && refHigh > refLow;
  const bandTop = hasBand ? yFor(refHigh as number) : 0;
  const bandBottom = hasBand ? yFor(refLow as number) : 0;

  const last = pts[pts.length - 1];

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.18} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {hasBand && (
          <Rect
            x={padX}
            y={Math.min(bandTop, bandBottom)}
            width={innerW}
            height={Math.abs(bandBottom - bandTop)}
            fill={color}
            opacity={0.06}
            rx={radii.sm}
          />
        )}

        {/* 1-line baseline, no grid */}
        <Line x1={padX} y1={baselineY} x2={width - padX} y2={baselineY} stroke={colors.border} strokeWidth={1} />

        {pts.length >= 2 && (
          <>
            <Path d={areaPath} fill={`url(#${gradientId})`} />
            <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* Highlighted latest point: white ring + solid dot */}
        <Circle cx={last.x} cy={last.y} r={5.5} fill={colors.surface} />
        <Circle cx={last.x} cy={last.y} r={3.5} fill={color} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
  },
});
