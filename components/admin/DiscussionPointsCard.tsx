import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { Card } from "@/components/ui";
import { colors, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

interface DiscussionPointsCardProps {
  points: string[];
}

export function DiscussionPointsCard({ points }: DiscussionPointsCardProps) {
  return (
    <Card>
      <View style={styles.header}>
        <MessageCircle size={20} color={colors.sage} />
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: fontSizes.headlineMd,
    fontWeight: fontWeights.bold,
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
