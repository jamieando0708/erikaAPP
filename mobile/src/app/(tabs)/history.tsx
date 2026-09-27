import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { CheckRow } from "../../components/CheckRow";
import { Body, Button, Eyebrow, Loading, Screen, Title } from "../../components/ui";
import { api } from "../../lib/api";
import { space } from "../../lib/theme";
import type { CheckSummary } from "../../lib/types";

export default function History() {
  const router = useRouter();
  const [checks, setChecks] = useState<CheckSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.checks().then(setChecks).catch(() => setChecks([]));
    }, []),
  );

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={{ gap: space.xs, paddingTop: space.md }}>
        <Eyebrow>History</Eyebrow>
        <Title>Everything you've checked</Title>
      </View>
      {checks === null ? (
        <Loading />
      ) : checks.length === 0 ? (
        <View style={{ gap: space.md }}>
          <Body muted>Nothing yet. Paste a link or claim on the Home tab, or share a video straight to Sift.</Body>
          <Button title="Check something" onPress={() => router.navigate("/")} />
        </View>
      ) : (
        checks.map((c) => <CheckRow key={c.id} check={c} onPress={() => router.push(`/check/${c.id}`)} />)
      )}
    </Screen>
  );
}
