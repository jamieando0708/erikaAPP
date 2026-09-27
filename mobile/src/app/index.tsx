import * as Clipboard from "expo-clipboard";
import { Link, Redirect, Stack, useFocusEffect, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Chips, ErrorText, Field, Heading, Loading, Screen } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors, font, space, verdictStyle } from "../lib/theme";
import type { CheckSummary } from "../lib/types";

const PLATFORM_NAMES: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
  snapchat: "Snapchat",
  threads: "Threads",
  pinterest: "Pinterest",
  reddit: "Reddit",
  other: "Video",
};

export default function Home() {
  const router = useRouter();
  const { ready, user, refresh } = useAuth();
  const { hasShareIntent } = useShareIntentContext();
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [profileId, setProfileId] = useState<string | undefined>();
  const [checks, setChecks] = useState<CheckSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refresh();
      api.checks().then(setChecks).catch(() => setChecks([]));
    }, [user?.id]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!ready) return <Loading />;
  if (!user) return <Redirect href="/welcome" />;
  if (hasShareIntent) return <Redirect href="/share" />;

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setLink(text);
  };

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      const { id } = await api.startCheck(link, note, profileId);
      setLink("");
      setNote("");
      setShowNote(false);
      router.push(`/check/${id}`);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const showProfilePicker = user.tier.personalAdvice && user.profiles.length > 1;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable accessibilityLabel="Settings" hitSlop={12}>
                <Text style={{ fontSize: 26 }}>⚙️</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      {Platform.OS !== "web" ? (
        <Card style={{ backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }}>
          <Heading>The easy way</Heading>
          <Body>
            In TikTok, Instagram, YouTube or Facebook, tap <Text style={styles.bold}>Share</Text> on a video, then pick{" "}
            <Text style={styles.bold}>FactFit</Text>. We'll check it for you.
          </Body>
        </Card>
      ) : null}

      <Card>
        <Heading>Or paste a link</Heading>
        <Field
          label="Video link"
          value={link}
          onChangeText={setLink}
          placeholder="https://www.tiktok.com/…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Button title="📋  Paste from clipboard" variant="secondary" onPress={paste} />
        {showNote ? (
          <Field
            label="What does the video say? (optional)"
            hint="Helps when a video has no captions."
            value={note}
            onChangeText={setNote}
            multiline
            style={{ minHeight: 90, textAlignVertical: "top" }}
          />
        ) : (
          <Pressable onPress={() => setShowNote(true)}>
            <Text style={styles.link}>+ Add a note about what the video says</Text>
          </Pressable>
        )}
        {showProfilePicker ? (
          <View style={{ gap: space.xs }}>
            <Text style={styles.label}>Who is this for?</Text>
            <Chips
              options={user.profiles.map((p) => ({ value: p.id, label: p.displayName }))}
              value={profileId ?? user.profiles[0]!.id}
              onChange={setProfileId}
            />
          </View>
        ) : null}
        <ErrorText message={error?.message ?? null} />
        {error?.code === "limit_reached" ? <Button title="See plans" onPress={() => router.push("/plans")} /> : null}
        <Button title="Check this video" onPress={start} loading={busy} disabled={!link.trim()} />
        <Body muted style={{ fontSize: font.small }}>
          {user.usage.checksRemaining} checks left this month · {user.tier.name}
        </Body>
      </Card>

      {user.tier.personalAdvice && !user.healthConsent ? (
        <Card style={{ backgroundColor: colors.warnBg, borderColor: "#FDE68A" }}>
          <Body>Add your health profile to get advice that fits you.</Body>
          <Button title="Set up my profile" onPress={() => router.push("/consent")} />
        </Card>
      ) : null}
      {!user.tier.personalAdvice ? (
        <Pressable onPress={() => router.push("/plans")}>
          <Text style={styles.link}>Want advice that fits your own health? See plans →</Text>
        </Pressable>
      ) : null}

      <Heading>Your checks</Heading>
      {checks === null ? (
        <Loading />
      ) : checks.length === 0 ? (
        <Body muted>Nothing yet. Share your first video!</Body>
      ) : (
        checks.map((c) => <CheckRow key={c.id} check={c} onPress={() => router.push(`/check/${c.id}`)} />)
      )}
    </Screen>
  );
}

function CheckRow({ check, onPress }: { check: CheckSummary; onPress: () => void }) {
  const v = check.verdict ? verdictStyle[check.verdict] : null;
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={[styles.scoreDot, { backgroundColor: v?.bg ?? "#F3F4F6" }]}>
          <Text style={{ fontSize: font.heading, fontWeight: "800", color: v?.color ?? colors.muted }}>
            {check.status === "processing" ? "…" : check.status === "failed" ? "!" : check.score}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.label}>
            {PLATFORM_NAMES[check.platform] ?? "Video"} · {v ? v.label : check.status === "failed" ? "Couldn't check" : "Checking…"}
          </Text>
          <Text numberOfLines={2} style={{ fontSize: font.small, color: colors.muted }}>
            {check.summary ?? check.error ?? check.url}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "800" },
  link: { color: colors.primary, fontSize: font.body, fontWeight: "600" },
  label: { fontSize: font.body, fontWeight: "600", color: colors.text },
  scoreDot: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
