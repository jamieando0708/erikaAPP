import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, ErrorText, Heading, Loading, Screen } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { claimStyle, colors, font, relevanceStyle, space, verdictStyle } from "../../lib/theme";
import type { Check } from "../../lib/types";

const WAITING_MESSAGES = [
  "Watching the video…",
  "Finding the claims…",
  "Checking the science…",
  "Reading trusted health sources…",
  "Writing up your results…",
];

export default function CheckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [check, setCheck] = useState<Check | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const c = await api.check(id);
        if (stopped) return;
        setCheck(c);
        if (c.status === "processing") timer = setTimeout(poll, 2500);
        else void refresh();
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    };
    void poll();
    const ticker = setInterval(() => setTick((t) => t + 1), 4000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(ticker);
    };
  }, [id, refresh]);

  const goHome = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (error) return <Screen><ErrorText message={error} /></Screen>;
  if (!check || check.status === "processing") {
    return <Loading label={`${WAITING_MESSAGES[tick % WAITING_MESSAGES.length]}\nThis usually takes under a minute.`} />;
  }
  if (check.status === "failed" || !check.report) {
    return (
      <Screen>
        <ErrorText message={check.error ?? "We couldn't check this video."} />
        <Button title="Try another video" onPress={goHome} />
      </Screen>
    );
  }

  const r = check.report;
  const v = verdictStyle[r.verdict] ?? verdictStyle.unverifiable!;
  const open = (url: string) => void WebBrowser.openBrowserAsync(url);

  const shareWithDoctor = async () => {
    try {
      const text = await api.doctorReport(check.id);
      await Share.share({ message: text });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen>
      {r.urgent_safety_warning ? (
        <Card style={{ backgroundColor: colors.dangerBg, borderColor: "#FCA5A5" }}>
          <Heading>⛔ Safety warning</Heading>
          <Body>{r.urgent_safety_warning}</Body>
        </Card>
      ) : null}

      <Card style={{ backgroundColor: v.bg, borderColor: v.bg, alignItems: "center" }}>
        <Text style={{ fontSize: 48 }}>{v.emoji}</Text>
        <Text style={[styles.score, { color: v.color }]}>{r.overall_score}/100</Text>
        <Text style={[styles.verdict, { color: v.color }]}>{v.label}</Text>
        <Body style={{ textAlign: "center" }}>{r.summary}</Body>
      </Card>

      {r.personal ? (
        <Card>
          <Heading>What this means for you</Heading>
          <Text
            style={[
              styles.pill,
              { color: relevanceStyle[r.personal.relevance]?.color, backgroundColor: relevanceStyle[r.personal.relevance]?.bg },
            ]}
          >
            {relevanceStyle[r.personal.relevance]?.label}
          </Text>
          <Body>{r.personal.advice}</Body>
          {r.personal.cautions.map((c, i) => (
            <Body key={i}>⚠️ {c}</Body>
          ))}
        </Card>
      ) : !user?.tier.personalAdvice ? (
        <Pressable onPress={() => router.push("/plans")}>
          <Card style={{ backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }}>
            <Body>🔒 Want to know if this advice is right for <Text style={{ fontWeight: "800" }}>you</Text>? Upgrade to Plus.</Body>
          </Card>
        </Pressable>
      ) : null}

      {r.see_a_professional ? (
        <Card style={{ backgroundColor: colors.warnBg, borderColor: "#FDE68A" }}>
          <Body>👩‍⚕️ Check with a doctor, pharmacist or other health professional before trying this.</Body>
        </Card>
      ) : null}

      {r.useful_takeaways.length ? (
        <Card>
          <Heading>Worth keeping</Heading>
          {r.useful_takeaways.map((t, i) => (
            <Body key={i}>✔️ {t}</Body>
          ))}
        </Card>
      ) : null}

      {r.claims.length ? (
        <Card>
          <Heading>What the video claims</Heading>
          {r.claims.map((c, i) => (
            <View key={i} style={styles.claim}>
              <Body style={{ fontWeight: "700" }}>"{c.claim}"</Body>
              <Text style={[styles.claimVerdict, { color: claimStyle[c.verdict]?.color }]}>
                {claimStyle[c.verdict]?.label}
              </Text>
              <Body>{c.explanation}</Body>
            </View>
          ))}
        </Card>
      ) : null}

      {r.red_flags.length ? (
        <Card>
          <Heading>Red flags</Heading>
          {r.red_flags.map((f, i) => (
            <Body key={i}>🚩 {f}</Body>
          ))}
        </Card>
      ) : null}

      {r.sources.length ? (
        <Card>
          <Heading>Sources</Heading>
          {r.sources.map((s) => (
            <Pressable key={s.url} onPress={() => open(s.url)}>
              <Text style={styles.source}>{s.title}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <View style={{ gap: space.sm }}>
        {user?.tier.doctorReports ? <Button title="Share with my doctor" variant="secondary" onPress={shareWithDoctor} /> : null}
        <Button title="Open the video" variant="secondary" onPress={() => open(check.url)} />
        <Button title="Check another video" onPress={goHome} />
      </View>
      <Body muted style={{ fontSize: font.small, textAlign: "center" }}>
        Checked by AI using published research. This is general information, not medical advice.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  score: { fontSize: 44, fontWeight: "900" },
  verdict: { fontSize: font.heading, fontWeight: "800" },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "700",
    fontSize: font.small,
  },
  claim: { gap: space.xs, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  claimVerdict: { fontWeight: "800", fontSize: font.body },
  source: { color: colors.primary, fontSize: font.body, textDecorationLine: "underline", paddingVertical: 4 },
});
