import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Body, Button, Card, ErrorText, Eyebrow, Heading, IconRing, type IconName, Screen, Title } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors, space } from "../lib/theme";

// Plain-language explicit consent for health data (required under GDPR and similar laws).
const POINTS: Array<{ icon: IconName; text: string }> = [
  { icon: "person-outline", text: "You can tell us about your health: age, conditions, medications, allergies, injuries and goals." },
  { icon: "locate-outline", text: "We use it only to tell you whether advice suits you." },
  { icon: "lock-closed-outline", text: "It's encrypted and stored securely. We never sell it or use it for ads." },
  {
    icon: "sparkles-outline",
    text: "To write your advice, the relevant details (never your name or email) go to our AI provider, Anthropic, which doesn't train its models on them.",
  },
  { icon: "download-outline", text: "See, download, change or delete it any time in Profile." },
  { icon: "hand-left-outline", text: "It's optional. Sift works without it." },
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
      <View style={{ gap: space.sm }}>
        <Eyebrow color={colors.primary}>Your context</Eyebrow>
        <Title>Your health isn't one-size-fits-all.</Title>
        <Body muted>Before you add anything, here's exactly what happens to it.</Body>
      </View>
      <Card style={{ gap: space.md }}>
        {POINTS.map((p) => (
          <View key={p.text} style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
            <IconRing name={p.icon} size={38} />
            <Body style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>{p.text}</Body>
          </View>
        ))}
      </Card>
      <Card style={{ borderColor: colors.warn + "55", backgroundColor: colors.warnBg }}>
        <Heading>Important</Heading>
        <Body>
          Sift isn't a doctor. Results are general information. Never start, stop or change a medication or treatment
          without talking to a health professional.
        </Body>
      </Card>
      <ErrorText message={error} />
      <Button title="I agree - add my context" onPress={agree} loading={busy} />
      <Button title="Not now" variant="ghost" onPress={() => router.replace("/")} />
    </Screen>
  );
}
