import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "@/components/ui";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

interface DiscussionPointsCardProps {
  points: string[];
}

export function DiscussionPointsCard({ points }: DiscussionPointsCardProps) {
  return (
    <Card padding="lg">
      <View style={styles.header}>
        <Text style={styles.heading}>Discussion Points</Text>
      </View>

      <View style={styles.list}>
        {points.map((point, index) => (
          <View key={index} style={styles.bulletRow}>
            <Text style={styles.bullet}>{"•"}</Text>
            <Text style={styles.bulletText}>{point}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  heading: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    color: colors.charcoal,
  },
  list: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
  },
  bullet: {
    fontSize: fontSizes.bodyMd,
    color: colors.sage,
    marginRight: spacing.sm,
    lineHeight: 22,
  },
  bulletText: {
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    flex: 1,
    lineHeight: 22,
  },
});
