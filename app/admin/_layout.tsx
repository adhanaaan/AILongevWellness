import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="review-queue" />
      <Stack.Screen name="exports" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="participants/[id]" />
    </Stack>
  );
}
