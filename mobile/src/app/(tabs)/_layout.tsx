import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { Loading } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { colors, fonts } from "../../lib/theme";

export default function TabsLayout() {
  const { ready, user } = useAuth();
  const { hasShareIntent } = useShareIntentContext();

  if (!ready) return <Loading />;
  if (!user) return <Redirect href="/welcome" />;
  if (hasShareIntent) return <Redirect href="/share" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, height: 64, paddingTop: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
