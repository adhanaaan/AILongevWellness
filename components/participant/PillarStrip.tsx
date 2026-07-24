import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ScoreRing } from "@/components/participant/ScoreRing";
import { Card } from "@/components/ui/Card";
import { colors, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

export interface PillarStripItem {
  key: string;
  label: string;
  value: number;
  status: "good" | "monitor";
  onPress: () => void;
  accessibilityLabel: string;
}

export interface PillarStripProps {
  items: PillarStripItem[];
}

// A compact, contained strip rather than three full-size hero rings -- the
// narrative sentence above already carries the "am I okay" answer, so these
// read as the supporting receipts, not a second headline.
export function PillarStrip({ items }: PillarStripProps) {
  return (
    <Card padding="lg">
      <Text style={styles.title}>Your pillar scores</Text>
      <View style={styles.row}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel}
            style={styles.item}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ScoreRing value={item.value} label={item.label} status={item.status} size={64} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.caption}>Tap a score to see what's driving it</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  item: {
    alignItems: "center",
  },
  caption: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
