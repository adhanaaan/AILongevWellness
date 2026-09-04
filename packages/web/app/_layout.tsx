import { useCallback } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/lib/theme/tokens";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { applyWebViewportFix } from "@/lib/web/viewportFix";
import { usePlatformInit } from "@/lib/platform";
import { useNativeBackHandler } from "@/lib/platform/useNativeBack";

SplashScreen.preventAutoHideAsync();

// output:single ignores app/+html.tsx, so patch viewport-fit=cover + #root dvh at
// runtime (web only) — otherwise bottom content clips under Safari's toolbar and
// safe-area insets read 0. Runs at module load, before first paint.
applyWebViewportFix();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Detects the native shell and, inside it, wires Supabase's auth storage to
  // the keychain over the bridge. This MUST resolve before AuthProvider mounts:
  // supabase-js takes its `storage` at createClient() time, and AuthProvider is
  // the first thing to build the client. Resolves within a few hundred ms in a
  // plain browser, where it changes nothing.
  const platformReady = usePlatformInit();
  useNativeBackHandler();

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && platformReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, platformReady]);

  if (!fontsLoaded || !platformReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="dark" />
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.cloud },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="pillar" />
          </Stack>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
