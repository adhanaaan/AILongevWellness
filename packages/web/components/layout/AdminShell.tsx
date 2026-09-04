import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { Users, ClipboardCheck, Download, Settings, Menu, X } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

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
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const email = session?.user?.email ?? "Demo clinician";
  const initials = email.slice(0, 2).toUpperCase();

  const sidebar = (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View>
          <Text style={styles.sidebarTitle}>AI Wellness</Text>
          <Text style={styles.sidebarSubtitle}>Admin Portal</Text>
        </View>
        {!isWide && (
          <TouchableOpacity
            onPress={() => setMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
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
      <TouchableOpacity
        style={styles.sidebarFooter}
        onPress={() => {
          setMenuOpen(false);
          router.push("/admin/settings");
        }}
      >
        <Avatar initials={initials} size="sm" />
        <View style={styles.footerText}>
          <Text style={styles.footerName} numberOfLines={1}>
            {email}
          </Text>
          <Text style={styles.footerRole}>Care team</Text>
        </View>
      </TouchableOpacity>
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
                <TouchableOpacity
                  onPress={() => setMenuOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open menu"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
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
            contentContainerStyle={[
              styles.contentInner,
              isWide && styles.contentInnerWide,
            ]}
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
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.bodyMd,
    color: colors.sageDark,
  },
  sidebarSubtitle: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
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
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
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
  footerText: {
    flex: 1,
  },
  footerName: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.charcoal,
  },
  footerRole: {
    fontFamily: fontFamilies.body,
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
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  headerTitle: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineMd,
    color: colors.charcoal,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
    paddingBottom: spacing["4xl"],
  },
  contentInnerWide: {
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing["2xl"],
    paddingBottom: spacing["5xl"],
    maxWidth: 1120,
    width: "100%",
  },
});
