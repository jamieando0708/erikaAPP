import { Redirect, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { Body, Button, Card, Screen, Title } from "../components/ui";
import { useAuth } from "../lib/auth";
import { font, space } from "../lib/theme";

const STEPS = [
  { emoji: "📱", text: "See a health or fitness video on TikTok, Instagram, YouTube or Facebook." },
  { emoji: "↗️", text: "Tap Share, then choose FactFit." },
  { emoji: "✅", text: "Get a simple score, what's true, what's not, and what it means for you." },
];

export default function Welcome() {
  const router = useRouter();
  const { user } = useAuth();
  if (user) return <Redirect href="/" />;

  return (
    <Screen>
      <View style={{ height: space.xl }} />
      <Text style={{ fontSize: 64, textAlign: "center" }}>🔍</Text>
      <Title>Is that video telling the truth?</Title>
      <Body muted>
        FactFit checks health and fitness advice from social media against real science - and filters out the
        rubbish.
      </Body>
      <Card>
        {STEPS.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
            <Text style={{ fontSize: font.heading }}>{s.emoji}</Text>
            <Body style={{ flex: 1 }}>{s.text}</Body>
          </View>
        ))}
      </Card>
      <Button title="Get started - it's free" onPress={() => router.push({ pathname: "/auth", params: { mode: "signup" } })} />
      <Button
        title="I already have an account"
        variant="secondary"
        onPress={() => router.push({ pathname: "/auth", params: { mode: "login" } })}
      />
      <Body muted style={{ fontSize: font.small, textAlign: "center" }}>
        FactFit gives general information, not medical advice. Always talk to a doctor before changing medication
        or treatment.
      </Body>
    </Screen>
  );
}
