import { Redirect, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Body, Button, ErrorText, Loading, Screen, Title } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { space } from "../lib/theme";

/** Opened from the phone's Share menu. Starts the check straight away - no extra taps. */
export default function ShareScreen() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const { hasShareIntent, shareIntent, resetShareIntent, isReady } = useShareIntentContext();
  const [error, setError] = useState<ApiError | null>(null);
  const started = useRef(false);

  const shared = shareIntent.webUrl ?? shareIntent.text ?? "";

  useEffect(() => {
    if (!ready || !user || !isReady || started.current) return;
    if (!hasShareIntent || !shared) return;
    started.current = true;
    api
      .startCheck(shared)
      .then(({ id }) => {
        resetShareIntent();
        router.replace(`/check/${id}`);
      })
      .catch((e: ApiError) => {
        resetShareIntent();
        setError(e);
      });
  }, [ready, user, isReady, hasShareIntent, shared, resetShareIntent, router]);

  if (!ready) return <Loading />;
  // Not logged in yet: the shared link is kept, and we come back here after login.
  if (!user) return <Redirect href="/welcome" />;

  if (error) {
    return (
      <Screen>
        <Title>Couldn't check that</Title>
        <ErrorText message={error.message} />
        <View style={{ gap: space.sm }}>
          {error.code === "limit_reached" ? (
            <Button title="See plans" onPress={() => router.replace("/plans")} />
          ) : null}
          <Button title="Go home" variant="secondary" onPress={() => router.replace("/")} />
        </View>
      </Screen>
    );
  }

  if (isReady && !hasShareIntent && !started.current) {
    return (
      <Screen>
        <Body>Nothing was shared. Go back to your video and tap Share → FactFit.</Body>
        <Button title="Go home" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  return <Loading label="Getting your video ready…" />;
}
