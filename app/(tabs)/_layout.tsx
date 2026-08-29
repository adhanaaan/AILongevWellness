import { Tabs } from "expo-router";
import { Sparkles, MessageCircle, ClipboardList, Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSizes } from "@/lib/theme/tokens";
import { ParticipantGuard } from "@/lib/auth/RouteGuard";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Clearance under the tab labels for the home indicator / notch safe area only.
  // The Safari floating-bar overlap is ALREADY handled by lib/web/viewportFix.ts,
  // which sizes the app to the visible viewport so the tab bar bottom sits right
  // above Safari's bar. A big artificial floor here on top of that just created a
  // dead white band below the labels (and squeezed the labels into a clip). So
  // this is now just the real safe-area inset, floored small.
  const bottomInset = Math.max(insets.bottom, 8);

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
            // Comfortable icon+label band (~56px) plus only the real safe-area
            // inset below it. The Safari-bar clearance lives in viewportFix.ts.
            height: 56 + bottomInset,
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
