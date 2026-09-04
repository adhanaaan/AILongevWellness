import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface CareTeamBadgeProps {
  gpInitials: string;
  tcmInitials: string;
}

export function CareTeamBadge({ gpInitials, tcmInitials }: CareTeamBadgeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatars}>
        <View style={styles.avatarFirst}>
          <Avatar initials={gpInitials} size="sm" />
        </View>
        <View style={styles.avatarSecond}>
          <Avatar initials={tcmInitials} size="sm" />
        </View>
      </View>
      <View style={styles.textRow}>
        <ShieldCheck size={16} color={colors.sage} style={styles.icon} />
        <Text style={styles.text}>Reviewed and signed off</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.sageTint,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  avatars: {
    flexDirection: "row",
    marginRight: spacing.md,
  },
  avatarFirst: {
    zIndex: 1,
  },
  avatarSecond: {
    marginLeft: -10,
    zIndex: 0,
  },
  textRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.medium,
    color: colors.sageDark,
  },
});
