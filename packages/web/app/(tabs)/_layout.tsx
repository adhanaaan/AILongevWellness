import { Tabs } from "expo-router";
import { Sparkles, MessageCircle, ClipboardList, Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSizes } from "@/lib/theme/tokens";
import { ParticipantGuard } from "@/lib/auth/RouteGuard";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Two things to satisfy:
  //  - The icon+label need a real ~56px band or the label clips (see below: the
  //    band = ICON_LABEL_BAND, independent of the inset).
  //  - A modest lift so it clears Safari's floating pill even if viewportFix.ts's
  //    visualViewport re-fit lands a frame late. viewportFix already sizes the app
  //    to the visible viewport; this inset is just a safety buffer + home indicator.
  const bottomInset = Math.max(insets.bottom, 20);
  const ICON_LABEL_BAND = 56;

  return (
    <ParticipantGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.sageDark,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarLabelStyle: {
            fontSize: fontSizes.caption,
            fontWeight: "500",
            lineHeight: 15,
          },
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            // Keep the bottom nav aligned with the 448 phone-width content column
            // on a wide (laptop) browser instead of spanning the full window.
            maxWidth: 448,
            width: "100%",
            alignSelf: "center",
            // Height = a full 56px icon+label band + the bottom inset. Because
            // paddingTop(8) + paddingBottom(bottomInset) are subtracted, the real
            // icon+label room = ICON_LABEL_BAND - 8 + ... so we add 8 back into the
            // band to keep a true ~56px of room for icon + label (no clip).
            height: ICON_LABEL_BAND + 8 + bottomInset,
            paddingTop: 8,
            paddingBottom: bottomInset,
          },
          tabBarItemStyle: {
            paddingTop: 2,
            paddingBottom: 2,
          },
        }}
      >
        <Tabs.Screen
          name="card"
          options={{
            title: "Insights",
            tabBarIcon: ({ color, size }) => (
              <Sparkles size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ava"
          options={{
            title: "Concierge",
            tabBarIcon: ({ color, size }) => (
              <MessageCircle size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tracking"
          options={{
            title: "Care Plan",
            tabBarIcon: ({ color, size }) => (
              <ClipboardList size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </ParticipantGuard>
  );
}
