import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui/Avatar";
import { colors, fontSizes } from "@/lib/theme/tokens";

interface MobileShellProps {
  children: React.ReactNode;
  greeting?: string;
  name?: string;
}

function timeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function MobileShell({
  children,
  greeting,
  name = "James",
}: MobileShellProps) {
  const resolvedGreeting = greeting ?? timeBasedGreeting();
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar initials={name.slice(0, 1)} size="sm" />
          <View>
            <Text style={styles.greeting}>{resolvedGreeting}</Text>
            <Text style={styles.name}>{name}</Text>
          </View>
        </View>
        <Text style={styles.brand}>AI Wellness</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  name: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  brand: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.sageDark,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
});
