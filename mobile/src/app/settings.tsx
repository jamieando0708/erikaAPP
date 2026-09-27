import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Platform, Share, View } from "react-native";
import { Body, Button, Card, ErrorText, Heading, Screen } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { space } from "../lib/theme";

/** Alert.alert with buttons doesn't work in a web browser, so use confirm() there. */
function confirmAction(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}

export default function Settings() {
  const router = useRouter();
  const { user, refresh, setUser, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (!user) return null;

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const canAddProfile = user.healthConsent && user.profiles.length < user.tier.maxProfiles;

  return (
    <Screen>
      <Card>
        <Heading>Your plan</Heading>
        <Body>
          {user.tier.name}
          {user.tier.priceUsdMonthly ? ` - $${user.tier.priceUsdMonthly}/month` : ""}
        </Body>
        <Body muted>
          {user.usage.checksThisMonth} checks used this month, {user.usage.checksRemaining} left
        </Body>
        <Button title="Change plan" variant="secondary" onPress={() => router.push("/plans")} />
      </Card>

      <Card>
        <Heading>Health profiles</Heading>
        {!user.healthConsent ? (
          <>
            <Body muted>You haven't added any health info.</Body>
            <Button title="Add my health info" onPress={() => router.push("/consent")} />
          </>
        ) : (
          <>
            {user.profiles.map((p) => (
              <Button
                key={p.id}
                title={`Edit ${p.displayName}`}
                variant="secondary"
                onPress={() => router.push({ pathname: "/profile", params: { id: p.id } })}
              />
            ))}
            {canAddProfile ? (
              <Button
                title={user.profiles.length ? "Add a family member" : "Create my profile"}
                onPress={() => router.push({ pathname: "/profile", params: user.profiles.length ? { name: "Family member" } : {} })}
              />
            ) : null}
            {!user.tier.personalAdvice ? (
              <Body muted>Your profile is saved, but personal advice needs the Plus or Pro plan.</Body>
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <Heading>Your privacy</Heading>
        <Body muted>Your health info is encrypted. You're in control of it.</Body>
        <View style={{ gap: space.sm }}>
          <Button
            title="Download my data"
            variant="secondary"
            onPress={() =>
              run(async () => {
                const data = await api.exportData();
                await Share.share({ message: JSON.stringify(data, null, 2) });
              })
            }
          />
          {user.healthConsent ? (
            <Button
              title="Delete my health info"
              variant="danger"
              onPress={() =>
                confirmAction(
                  "Delete health info?",
                  "This removes all health profiles. Your account and past checks stay.",
                  "Delete",
                  () => void run(async () => setUser(await api.withdrawConsent())),
                )
              }
            />
          ) : null}
          <Button
            title="Delete my account"
            variant="danger"
            onPress={() =>
              confirmAction("Delete account?", "This permanently deletes your account and everything in it.", "Delete", () =>
                void run(async () => {
                  await api.deleteAccount();
                  await signOut();
                  router.replace("/welcome");
                }),
              )
            }
          />
        </View>
      </Card>

      <ErrorText message={error} />
      <Body muted>Logged in as {user.email}</Body>
      <Button
        title="Log out"
        variant="secondary"
        onPress={() =>
          void run(async () => {
            await signOut();
            router.replace("/welcome");
          })
        }
      />
    </Screen>
  );
}
