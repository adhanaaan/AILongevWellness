import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stethoscope } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import type { Review } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface CareTeamNotesCardProps {
  gp?: Review;
  tcm?: Review;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function ReviewerNote({ review }: { review: Review }) {
  return (
    <View style={styles.reviewerRow}>
      <Avatar initials={initialsOf(review.reviewer_name)} size="sm" />
      <View style={styles.reviewerText}>
        <Text style={styles.reviewerName}>
          {review.reviewer_name}
          <Text style={styles.reviewerCredential}>, {review.reviewer_credential}</Text>
        </Text>
        <Text style={styles.notes}>{review.notes}</Text>
      </View>
    </View>
  );
}

export function CareTeamNotesCard({ gp, tcm }: CareTeamNotesCardProps) {
  if (!gp && !tcm) return null;

  return (
    <Card tinted>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Stethoscope size={18} color={colors.sageDark} />
        </View>
        <Text style={styles.heading}>Notes from your care team</Text>
      </View>
      {gp && <ReviewerNote review={gp} />}
      {gp && tcm && <View style={styles.divider} />}
      {tcm && <ReviewerNote review={tcm} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  reviewerRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  reviewerText: {
    flex: 1,
  },
  reviewerName: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.charcoal,
  },
  reviewerCredential: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.inkMuted,
  },
  notes: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginVertical: spacing.lg,
  },
});
