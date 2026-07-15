import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { Users, ClipboardCheck, Download, Settings, Menu, X } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { colors, fontSizes, radii } from "@/lib/theme/tokens";

const NAV_ITEMS = [
  { href: "/admin", label: "Participants", Icon: Users },
  { href: "/admin/review-queue", label: "Review queue", Icon: ClipboardCheck },
  { href: "/admin/exports", label: "Exports", Icon: Download },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
] as const;

interface AdminShellProps {
  children: React.ReactNode;
  title: string;
  headerActions?: React.ReactNode;
}

export function AdminShell({ children, title, headerActions }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isWide = Dimensions.get("window").width >= 768;

  const sidebar = (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View>
          <Text style={styles.sidebarTitle}>AI Wellness</Text>
          <Text style={styles.sidebarSubtitle}>Admin Portal</Text>
        </View>
        {!isWide && (
          <TouchableOpacity onPress={() => setMenuOpen(false)}>
            <X size={20} color={colors.inkMuted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.nav}>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href === "/admin" && pathname.startsWith("/admin/participants"));
          return (
            <TouchableOpacity
              key={href}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => {
                setMenuOpen(false);
                router.push(href as any);
              }}
            >
              <Icon size={18} color={active ? colors.sageDark : colors.inkMuted} />
              <Text
                style={[
                  styles.navLabel,
                  { color: active ? colors.sageDark : colors.inkMuted },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.sidebarFooter}>
        <Avatar initials="HM" size="sm" />
        <View>
          <Text style={styles.footerName}>Dr. Helena Marsh</Text>
          <Text style={styles.footerRole}>Care team</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.row}>
        {isWide && sidebar}

        {!isWide && (
          <Modal visible={menuOpen} animationType="slide" transparent>
            <View style={styles.overlay}>
              <TouchableOpacity
                style={styles.overlayBg}
                onPress={() => setMenuOpen(false)}
              />
              {sidebar}
            </View>
          </Modal>
        )}

        <View style={styles.main}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {!isWide && (
                <TouchableOpacity onPress={() => setMenuOpen(true)}>
                  <Menu size={22} color={colors.charcoal} />
                </TouchableOpacity>
              )}
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {headerActions}
          </View>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 256,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
    ...Platform.select({
      web: { height: "100%" as any },
      default: { flex: 1, maxWidth: 256 },
    }),
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sidebarTitle: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.sageDark,
  },
  sidebarSubtitle: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  nav: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  navItemActive: {
    backgroundColor: colors.sageTint,
  },
  navLabel: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
  },
  sidebarFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footerName: {
    fontSize: fontSizes.labelMd,
    color: colors.charcoal,
  },
  footerRole: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  overlayBg: {
    flex: 1,
    backgroundColor: "rgba(26, 28, 28, 0.4)",
  },
  main: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 32,
  },
});
