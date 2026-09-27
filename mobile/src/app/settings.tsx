import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Share } from "react-native";
import { Body, Card, ErrorText, Eyebrow, Row, Screen } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

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
  const { user, setUser, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const logOut = () =>
    void run(async () => {
      await signOut();
      router.replace("/welcome");
    });

  return (
    <Screen>
      <Eyebrow>Your privacy</Eyebrow>
      <Card style={{ gap: 0 }}>
        <Body muted style={{ paddingBottom: 8 }}>Your health info is encrypted, and you're in control of it.</Body>
        <Row
          icon="download-outline"
          title="Download my data"
          subtitle="Everything Sift stores about you"
          onPress={() =>
            void run(async () => {
              const data = await api.exportData();
              await Share.share({ message: JSON.stringify(data, null, 2) });
            })
          }
        />
        {user.healthConsent ? (
          <Row
            icon="trash-outline"
            title="Delete my health info"
            subtitle="Removes all health profiles"
            onPress={() =>
              confirmAction("Delete health info?", "This removes all health profiles. Your account and past checks stay.", "Delete", () =>
                void run(async () => setUser(await api.withdrawConsent())),
              )
            }
          />
        ) : null}
      </Card>

      <Eyebrow>Account</Eyebrow>
      <Card style={{ gap: 0 }}>
        <Row icon="mail-outline" title="Email" subtitle={user.email} />
        <Row icon="log-out-outline" title="Log out" onPress={logOut} />
        <Row
          icon="close-circle-outline"
          title="Delete my account"
          subtitle="Permanently deletes everything"
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
      </Card>
      <ErrorText message={error} />
      <Body muted style={{ fontSize: 13, color: colors.faint }}>
        Sift gives general information, not medical advice.
      </Body>
    </Screen>
  );
}
