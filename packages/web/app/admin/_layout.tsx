import { Stack } from "expo-router";
import { CareTeamGuard } from "@/lib/auth/RouteGuard";

export default function AdminLayout() {
  return (
    <CareTeamGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="index" />
        <Stack.Screen name="review-queue" />
        <Stack.Screen name="exports" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="participants/[id]" />
      </Stack>
    </CareTeamGuard>
  );
}
