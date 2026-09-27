import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ShareIntentProvider } from "expo-share-intent";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../lib/auth";
import { colors, fonts } from "../lib/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    // Receives links shared to Sift from TikTok, Instagram, YouTube, etc.
    // Must wrap everything else. The share sheet only exists on phones.
    <ShareIntentProvider options={{ disabled: Platform.OS === "web", resetOnBackground: true }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: fonts.heading, color: colors.text },
              headerTintColor: colors.primary,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ title: "" }} />
            <Stack.Screen name="consent" options={{ title: "" }} />
            <Stack.Screen name="profile" options={{ title: "Health profile" }} />
            <Stack.Screen name="share" options={{ title: "", headerBackVisible: false }} />
            <Stack.Screen name="check/[id]" options={{ title: "Results" }} />
            <Stack.Screen name="plans" options={{ title: "Plans" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}
