import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

export interface NextStepsCardProps {
  points: string[];
}

export function NextStepsCard({ points }: NextStepsCardProps) {
  if (points.length === 0) return null;

  return (
    <Card>
      <View style={styles.header}>
        <MessageCircle size={20} color={colors.sage} />
        <Text style={styles.heading}>Bring up with your doctor</Text>
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
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    fontWeight: fontWeights.semibold,
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
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    flex: 1,
    lineHeight: 22,
  },
});
