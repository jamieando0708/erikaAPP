import { Stack } from "expo-router";
import { ShareIntentProvider } from "expo-share-intent";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../lib/auth";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    // Receives links shared to FactFit from TikTok, Instagram, YouTube, etc.
    // Must wrap everything else. The share sheet only exists on phones.
    <ShareIntentProvider options={{ disabled: Platform.OS === "web", resetOnBackground: true }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
              headerTitleStyle: { fontWeight: "700" },
              headerTintColor: colors.primary,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="index" options={{ title: "FactFit" }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ title: "" }} />
            <Stack.Screen name="consent" options={{ title: "Your health info" }} />
            <Stack.Screen name="profile" options={{ title: "Health profile" }} />
            <Stack.Screen name="share" options={{ title: "Checking video", headerBackVisible: false }} />
            <Stack.Screen name="check/[id]" options={{ title: "Fact-check" }} />
            <Stack.Screen name="plans" options={{ title: "Plans" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}
