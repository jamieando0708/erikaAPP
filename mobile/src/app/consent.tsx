import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Body, Button, Card, ErrorText, Heading, Screen, Title } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { font, space } from "../lib/theme";

// Plain-language explicit consent for health data (required under GDPR and similar laws).
const POINTS = [
  "You can tell us about your health: age, conditions, medications, allergies, injuries and goals.",
  "We use it only to tell you whether a video's advice suits you.",
  "It is encrypted and stored securely. We never sell it or use it for ads.",
  "To write your advice, the relevant details (never your name or email) are sent to our AI provider, Anthropic, which does not use them to train its models.",
  "You can see, download, change or delete it at any time in Settings.",
  "This is optional. You can use FactFit without it.",
];

export default function Consent() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agree = async () => {
    setBusy(true);
    setError(null);
    try {
      setUser(await api.giveConsent());
      router.replace("/profile");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Get advice that fits you</Title>
      <Body muted>Before you add any health details, here's exactly what happens to them.</Body>
      <Card>
        {POINTS.map((p, i) => (
          <View key={i} style={{ flexDirection: "row", gap: space.sm }}>
            <Text style={{ fontSize: font.body }}>•</Text>
            <Body style={{ flex: 1 }}>{p}</Body>
          </View>
        ))}
      </Card>
      <Card>
        <Heading>Important</Heading>
        <Body>
          FactFit is not a doctor. Our checks are general information. Never start, stop or change a medication or
          treatment without talking to a health professional.
        </Body>
      </Card>
      <ErrorText message={error} />
      <Button title="I agree - add my health info" onPress={agree} loading={busy} />
      <Button title="Not now" variant="secondary" onPress={() => router.replace("/")} />
    </Screen>
  );
}
