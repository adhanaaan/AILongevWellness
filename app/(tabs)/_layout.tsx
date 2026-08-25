import { Tabs } from "expo-router";
import { Sparkles, MessageCircle, ClipboardList, Settings } from "lucide-react-native";
import { colors, fontSizes } from "@/lib/theme/tokens";
import { ParticipantGuard } from "@/lib/auth/RouteGuard";

export default function TabsLayout() {
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
            // On mobile Safari there's no SafeAreaProvider + viewport-fit=cover, so
            // env(safe-area-inset-bottom) reads 0 and the labels clip behind the
            // home indicator / browser chrome. Give the bar real height + bottom
            // padding so the icons and labels always clear that zone.
            height: 80,
            paddingTop: 8,
            paddingBottom: 26,
          },
          tabBarItemStyle: {
            paddingTop: 2,
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
