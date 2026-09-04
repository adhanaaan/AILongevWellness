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
  name,
}: MobileShellProps) {
  const resolvedGreeting = greeting ?? timeBasedGreeting();
  // No hard-coded fallback name — while the real participant loads, `name` is
  // undefined; showing a demo name ("James") here leaked the demo identity into
  // real accounts. Render the greeting alone until the real name arrives.
  const displayName = name?.trim() ?? "";
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar initials={displayName ? displayName.slice(0, 1) : ""} size="sm" />
          <View>
            <Text style={styles.greeting}>{resolvedGreeting}</Text>
            {displayName ? <Text style={styles.name}>{displayName}</Text> : null}
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
    // Phone-first product: on a wide (laptop) browser, keep the app as a centered
    // phone-width column instead of stretching edge-to-edge. Matches the 448 cap
    // the onboarding screens already use. No effect on real phones (screens are
    // narrower than 448, so width:100% wins).
    width: "100%",
    maxWidth: 448,
    alignSelf: "center",
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
