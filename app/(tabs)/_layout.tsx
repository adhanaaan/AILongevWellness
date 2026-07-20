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
