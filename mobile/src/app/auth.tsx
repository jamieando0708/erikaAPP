import { useLocalSearchParams, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useState } from "react";
import { Body, Button, ErrorText, Field, Screen, Title } from "../components/ui";
import { useAuth } from "../lib/auth";

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === "login" ? "login" : "signup";
  const { signIn } = useAuth();
  const { hasShareIntent } = useShareIntentContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(mode, email, password);
      if (hasShareIntent) router.replace("/share");
      else if (mode === "signup") router.replace("/consent");
      else router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>{mode === "signup" ? "Create your account" : "Welcome back"}</Title>
      {mode === "signup" ? <Body muted>You get 3 free checks every month.</Body> : null}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Password"
        hint={mode === "signup" ? "At least 8 characters." : undefined}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        textContentType={mode === "signup" ? "newPassword" : "password"}
        onSubmitEditing={submit}
      />
      <ErrorText message={error} />
      <Button
        title={mode === "signup" ? "Create account" : "Log in"}
        onPress={submit}
        loading={busy}
        disabled={!email || !password}
      />
      <Button
        title={mode === "signup" ? "I already have an account" : "Create a new account"}
        variant="secondary"
        onPress={() => router.setParams({ mode: mode === "signup" ? "login" : "signup" })}
      />
    </Screen>
  );
}
