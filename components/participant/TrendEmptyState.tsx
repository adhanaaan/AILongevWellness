import React, { useState } from "react";
import { View, Text, StyleSheet, type LayoutChangeEvent } from "react-native";
import Svg, { Line, Circle } from "react-native-svg";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export interface TrendEmptyStateProps {
  /** Honest message about why there's no line yet. */
  message: string;
  /** Optional current data point to plot as the single "starts charting here" dot. */
  currentValue?: number | null;
  unit?: string;
  color?: string;
}

// The honest zero/one-point state: never interpolate or fabricate a line. When a
// single current value exists (e.g. today's biological age), we plot just that
// one point on a baseline so it reads as "charting starts here"; otherwise a bare
// baseline. Calm, restrained -- matches the sparkline's visual language.
export function TrendEmptyState({ message, currentValue, unit, color = colors.sage }: TrendEmptyStateProps) {
  const [width, setWidth] = useState(0);
  const height = 64;
  const padX = 6;
  const midY = height / 2;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const hasPoint = currentValue != null;

  return (
    <Card padding="lg" style={styles.card}>
      <View style={styles.chartWrap} onLayout={onLayout}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line x1={padX} y1={midY} x2={width - padX} y2={midY} stroke={colors.border} strokeWidth={1} />
            {hasPoint && (
              <>
                <Circle cx={padX + 2} cy={midY} r={5.5} fill={colors.surface} />
                <Circle cx={padX + 2} cy={midY} r={3.5} fill={color} />
              </>
            )}
          </Svg>
        )}
      </View>
      {hasPoint && (
        <Text style={styles.value}>
          {Number.isInteger(currentValue as number) ? String(currentValue) : String(Math.round((currentValue as number) * 100) / 100)}
          {unit ? <Text style={styles.unit}> {unit}</Text> : null}
        </Text>
      )}
      <Text style={styles.message}>{message}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {},
  chartWrap: {
    width: "100%",
  },
  value: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.charcoal,
    marginTop: spacing.sm,
  },
  unit: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  message: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
