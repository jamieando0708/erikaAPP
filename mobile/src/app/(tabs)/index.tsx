import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { CheckRow } from "../../components/CheckRow";
import { PulseMark } from "../../components/Logo";
import { Body, Button, Card, Chips, ErrorText, Eyebrow, Field, IconRing, Screen, Title } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, fonts, size, space } from "../../lib/theme";
import type { CheckSummary } from "../../lib/types";

export default function Home() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [input, setInput] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [profileId, setProfileId] = useState<string | undefined>();
  const [recent, setRecent] = useState<CheckSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      api.checks().then((c) => setRecent(c.slice(0, 3))).catch(() => setRecent([]));
    }, [refresh]),
  );

  if (!user) return null;

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setInput(text);
  };

  const analyse = async () => {
    setError(null);
    setBusy(true);
    try {
      const { id } = await api.startCheck(input, note, profileId);
      setInput("");
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
  const looksLikeLink = /https?:\/\//i.test(input);

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={{ alignItems: "center", gap: space.sm, paddingTop: space.lg, paddingBottom: space.sm }}>
        <PulseMark size={44} />
        <Title style={{ textAlign: "center" }}>That claim?{"\n"}Let's check it.</Title>
      </View>

      <Field
        icon="search"
        value={input}
        onChangeText={setInput}
        placeholder="Paste a link, post or claim…"
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        style={{ paddingVertical: 16, maxHeight: 140 }}
      />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="Paste" icon="clipboard-outline" variant="secondary" onPress={paste} />
        </View>
        <View style={{ flex: 2 }}>
          <Button title="Analyse" onPress={analyse} loading={busy} disabled={!input.trim()} />
        </View>
      </View>

      {looksLikeLink ? (
        showNote ? (
          <Field
            label="What does the video say? (optional)"
            hint="Only needed if we can't hear the video."
            value={note}
            onChangeText={setNote}
            multiline
            style={{ minHeight: 80, textAlignVertical: "top", paddingVertical: 12 }}
          />
        ) : (
          <Pressable onPress={() => setShowNote(true)}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: size.small }}>
              + Add a note about what it says
            </Text>
          </Pressable>
        )
      ) : null}

      {showProfilePicker ? (
        <View style={{ gap: space.sm }}>
          <Eyebrow>Checking for</Eyebrow>
          <Chips
            options={user.profiles.map((p) => ({ value: p.id, label: p.displayName }))}
            value={profileId ?? user.profiles[0]!.id}
            onChange={setProfileId}
          />
        </View>
      ) : null}

      <ErrorText message={error?.message ?? null} />
      {error?.code === "limit_reached" ? <Button title="See plans" onPress={() => router.push("/plans")} /> : null}

      <Text style={{ fontFamily: fonts.body, fontSize: size.small, color: colors.faint, textAlign: "center" }}>
        {user.usage.checksRemaining} checks left this month · {user.tier.name}
      </Text>

      {Platform.OS !== "web" ? (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <IconRing name="share-outline" />
          <Body style={{ flex: 1, fontSize: size.small, lineHeight: 21 }}>
            <Text style={{ fontFamily: fonts.bodySemi }}>Faster: </Text>
            tap Share on any TikTok, Instagram, YouTube or Facebook video and choose Sift.
          </Body>
        </Card>
      ) : null}

      {user.tier.personalAdvice && !user.healthConsent ? (
        <Card style={{ borderColor: colors.primary + "55" }}>
          <Body>Add your health context so every result tells you what it means for you.</Body>
          <Button title="Add my context" variant="secondary" onPress={() => router.push("/consent")} />
        </Card>
      ) : null}

      {recent && recent.length > 0 ? (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Eyebrow>Recent</Eyebrow>
            <Pressable onPress={() => router.push("/history")}>
              <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: size.small }}>See all</Text>
            </Pressable>
          </View>
          {recent.map((c) => (
            <CheckRow key={c.id} check={c} onPress={() => router.push(`/check/${c.id}`)} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
