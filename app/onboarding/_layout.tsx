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
      <Stack.Screen name="profile-goals" />
      <Stack.Screen name="profile-lifestyle" />
      <Stack.Screen name="capture" />
      <Stack.Screen name="capture-wearables-intro" />
      <Stack.Screen name="capture-wearables-upload" />
      <Stack.Screen name="capture-body-composition-intro" />
      <Stack.Screen name="capture-body-composition-upload" />
      <Stack.Screen name="capture-lab-reports-intro" />
      <Stack.Screen name="capture-lab-reports-upload" />
      <Stack.Screen name="capture-recognaize" />
      <Stack.Screen name="capture-calculating" />
    </Stack>
  );
}
