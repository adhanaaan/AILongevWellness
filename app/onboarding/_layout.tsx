import { Stack } from "expo-router";
import { colors } from "@/lib/theme/tokens";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cloud },
      }}
    >
      <Stack.Screen name="consent" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="capture" />
    </Stack>
  );
}
