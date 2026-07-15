import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check, Lock } from "lucide-react-native";
import { colors, fontSizes, fontWeights, spacing, radii } from "@/lib/theme/tokens";

interface StatusTimelineProps {
  stages: string[];
  currentIndex: number;
}

const CIRCLE_SIZE = 32;
const LINE_HEIGHT = 2;

export function StatusTimeline({ stages, currentIndex }: StatusTimelineProps) {
  return (
    <View style={styles.container}>
      {stages.map((stage, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        const isLocked = index > currentIndex;
        const isLast = index === stages.length - 1;

        return (
          <React.Fragment key={index}>
            <View style={styles.stageItem}>
              {isDone && (
                <View style={[styles.circle, styles.circleDone]}>
                  <Check size={16} color={colors.white} strokeWidth={3} />
                </View>
              )}
              {isActive && (
                <View style={[styles.circle, styles.circleActive]}>
                  <Text style={styles.activeNumber}>{index + 1}</Text>
                </View>
              )}
              {isLocked && (
                <View style={[styles.circle, styles.circleLocked]}>
                  <Lock size={14} color={colors.inkMuted} />
                </View>
              )}
              <Text
                style={[
                  styles.label,
                  isDone && styles.labelDone,
                  isActive && styles.labelActive,
                  isLocked && styles.labelLocked,
                ]}
                numberOfLines={1}
              >
                {stage}
              </Text>
            </View>

            {!isLast && (
              <View
                style={[
                  styles.line,
                  { backgroundColor: isDone ? colors.sage : colors.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stageItem: {
    alignItems: "center",
    minWidth: 56,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: colors.sage,
  },
  circleActive: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.sage,
  },
  circleLocked: {
    backgroundColor: colors.surfaceMuted,
  },
  activeNumber: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.bold,
    color: colors.sage,
  },
  line: {
    height: LINE_HEIGHT,
    flex: 1,
    alignSelf: "center",
    marginTop: CIRCLE_SIZE / 2 - LINE_HEIGHT / 2,
    marginHorizontal: spacing.xs,
  },
  label: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  labelDone: {
    color: colors.sageDark,
  },
  labelActive: {
    color: colors.charcoal,
    fontWeight: fontWeights.semibold,
  },
  labelLocked: {
    color: colors.inkMuted,
  },
});
