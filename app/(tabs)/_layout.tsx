import { Tabs } from "expo-router";
import { Sparkles, MessageCircle, ClipboardList, Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSizes } from "@/lib/theme/tokens";
import { ParticipantGuard } from "@/lib/auth/RouteGuard";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Real home-indicator inset now that the app has a SafeAreaProvider +
  // viewport-fit=cover (app/+html.tsx). Keep a min of 20 as a safety net in case
  // the web build reports a 0 inset, so labels still clear the home indicator.
  const bottomInset = Math.max(insets.bottom, 20);

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
            // Lift icons + labels clear of the home indicator / Safari chrome using
            // the real safe-area inset (see app/+html.tsx + the root SafeAreaProvider).
            height: 56 + bottomInset,
            paddingTop: 8,
            paddingBottom: bottomInset,
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
