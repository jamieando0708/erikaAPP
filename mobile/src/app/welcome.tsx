import { Redirect, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "../components/Logo";
import { Button, IconRing, type IconName } from "../components/ui";
import { WaveBackdrop } from "../components/WaveBackdrop";
import { useAuth } from "../lib/auth";
import { colors, fonts, size, space } from "../lib/theme";

const PILLARS: Array<{ icon: IconName; label: string }> = [
  { icon: "flask-outline", label: "Real\nevidence" },
  { icon: "person-circle-outline", label: "Personal\ncontext" },
  { icon: "help-circle-outline", label: "Clear\nanswers" },
];

export default function Welcome() {
  const router = useRouter();
  const { user } = useAuth();
  if (user) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <WaveBackdrop />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: space.lg, justifyContent: "space-between", maxWidth: 640, width: "100%", alignSelf: "center" }}>
          <View style={{ gap: space.lg, paddingTop: space.xl * 1.5 }}>
            <Logo size={52} />
            <Text style={styles.tagline}>CUT THROUGH THE NOISE.{"\n"}UNDERSTAND YOUR HEALTH.</Text>
          </View>

          <View style={{ gap: space.lg }}>
            <Text style={styles.story}>
              The internet is full of health information.{" "}
              <Text style={{ color: colors.primary }}>We make sense of it.</Text>
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {PILLARS.map((p) => (
                <View key={p.label} style={{ alignItems: "center", gap: space.sm, flex: 1 }}>
                  <IconRing name={p.icon} />
                  <Text style={styles.pillar}>{p.label.toUpperCase()}</Text>
                </View>
              ))}
            </View>
            <View style={{ gap: space.sm }}>
              <Button title="Get started" onPress={() => router.push({ pathname: "/auth", params: { mode: "signup" } })} />
              <Button
                title="I already have an account"
                variant="ghost"
                onPress={() => router.push({ pathname: "/auth", params: { mode: "login" } })}
              />
            </View>
            <Text style={styles.footer}>FACTS  /  EVIDENCE  /  YOU</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = {
  tagline: { fontFamily: fonts.bodyMedium, fontSize: 14, letterSpacing: 3.5, lineHeight: 24, color: colors.text },
  story: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 32, color: colors.text },
  pillar: { fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 1.8, color: colors.muted, textAlign: "center" as const },
  footer: {
    fontFamily: fonts.bodyMedium,
    fontSize: size.eyebrow,
    letterSpacing: 3,
    color: colors.faint,
    textAlign: "center" as const,
  },
};
