import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { PulseMark } from "../../components/Logo";
import { Body, Button, Card, ErrorText, Eyebrow, Pill, Screen, ScoreRing, Title } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { claimStyle, colors, fonts, PLATFORM_NAMES, relevanceStyle, size, space, verdictStyle } from "../../lib/theme";
import type { Check } from "../../lib/types";

const WAITING_MESSAGES = [
  "Listening to the video…",
  "Finding the claims…",
  "Checking the science…",
  "Reading trusted health sources…",
  "Weighing up the evidence…",
  "Writing up your results…",
];

export default function CheckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [check, setCheck] = useState<Check | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [showSources, setShowSources] = useState(false);

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
    const ticker = setInterval(() => setTick((t) => t + 1), 3500);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(ticker);
    };
  }, [id, refresh]);

  const goHome = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (error) {
    return (
      <Screen>
        <ErrorText message={error} />
      </Screen>
    );
  }
  if (!check || check.status === "processing") {
    return (
      <View style={styles.waiting}>
        <PulseMark size={56} />
        <Text style={styles.waitingText}>{WAITING_MESSAGES[tick % WAITING_MESSAGES.length]}</Text>
        <Body muted style={{ textAlign: "center" }}>This usually takes under a minute.</Body>
      </View>
    );
  }
  if (check.status === "failed" || !check.report) {
    return (
      <Screen>
        <ErrorText message={check.error ?? "We couldn't check this one."} />
        <Button title="Try something else" onPress={goHome} />
      </Screen>
    );
  }

  const r = check.report;
  const v = verdictStyle[r.verdict] ?? verdictStyle.unverifiable!;
  const open = (url: string) => void WebBrowser.openBrowserAsync(url);
  const isLink = check.platform !== "text";

  const shareWithDoctor = async () => {
    try {
      await Share.share({ message: await api.doctorReport(check.id) });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen>
      {r.urgent_safety_warning ? (
        <Card style={{ backgroundColor: colors.dangerBg, borderColor: colors.danger + "66" }}>
          <View style={styles.inline}>
            <Ionicons name="warning" size={22} color={colors.danger} />
            <Text style={[styles.cardTitle, { color: colors.danger }]}>Safety warning</Text>
          </View>
          <Body>{r.urgent_safety_warning}</Body>
        </Card>
      ) : null}

      <Eyebrow>{PLATFORM_NAMES[check.platform] ?? "Link"}</Eyebrow>
      <Title>{r.headline ?? r.summary}</Title>
      <View style={[styles.inline, { gap: space.md }]}>
        <ScoreRing score={r.overall_score} color={v.color} size={76} stroke={6} />
        <View style={{ flex: 1, gap: space.sm }}>
          <Pill label={v.label} color={v.color} bg={v.bg} icon={v.icon as never} />
          <Text style={styles.scoreCaption}>Evidence score out of 100</Text>
        </View>
      </View>
      {r.headline ? <Body>{r.summary}</Body> : null}

      {r.personal ? (
        <Card style={{ borderColor: (relevanceStyle[r.personal.relevance]?.color ?? colors.primary) + "55" }}>
          <Eyebrow color={colors.primary}>For you</Eyebrow>
          <Pill
            label={relevanceStyle[r.personal.relevance]?.label ?? ""}
            color={relevanceStyle[r.personal.relevance]?.color ?? colors.muted}
            bg={relevanceStyle[r.personal.relevance]?.bg ?? colors.surfaceRaised}
            icon={relevanceStyle[r.personal.relevance]?.icon as never}
          />
          <Body>{r.personal.advice}</Body>
          {r.personal.cautions.map((c) => (
            <View key={c} style={styles.point}>
              <Ionicons name="warning-outline" size={18} color={colors.warn} style={styles.pointIcon} />
              <Body style={styles.pointText}>{c}</Body>
            </View>
          ))}
        </Card>
      ) : !user?.tier.personalAdvice ? (
        <Pressable onPress={() => router.push("/plans")}>
          <Card style={[styles.inline, { borderColor: colors.primary + "44" }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            <Body style={{ flex: 1, fontSize: size.small, lineHeight: 21 }}>
              See what this means for <Text style={{ fontFamily: fonts.bodySemi }}>you</Text>, based on your health
              context. Available on Plus.
            </Body>
          </Card>
        </Pressable>
      ) : null}

      {r.see_a_professional ? (
        <Card style={[styles.inline, { backgroundColor: colors.warnBg, borderColor: colors.warn + "44" }]}>
          <Ionicons name="medkit-outline" size={20} color={colors.warn} />
          <Body style={{ flex: 1, fontSize: size.small, lineHeight: 21 }}>
            Check with a doctor, pharmacist or other health professional before trying this.
          </Body>
        </Card>
      ) : null}

      {r.claims.length ? (
        <Card>
          <Text style={styles.cardTitle}>Key points</Text>
          {r.claims.map((c) => {
            const cs = claimStyle[c.verdict] ?? claimStyle.unverifiable!;
            return (
              <View key={c.claim} style={styles.claim}>
                <View style={styles.point}>
                  <Ionicons name={cs.icon as never} size={20} color={cs.color} style={styles.pointIcon} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.claimText}>{c.claim}</Text>
                    <Text style={[styles.claimVerdict, { color: cs.color }]}>{cs.label}</Text>
                    <Body muted style={{ fontSize: 15, lineHeight: 22 }}>{c.explanation}</Body>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      {r.useful_takeaways.length ? (
        <Card>
          <Text style={styles.cardTitle}>Worth keeping</Text>
          {r.useful_takeaways.map((t) => (
            <View key={t} style={styles.point}>
              <Ionicons name="checkmark" size={20} color={colors.primary} style={styles.pointIcon} />
              <Body style={styles.pointText}>{t}</Body>
            </View>
          ))}
        </Card>
      ) : null}

      {r.red_flags.length ? (
        <Card>
          <Text style={styles.cardTitle}>Red flags</Text>
          {r.red_flags.map((f) => (
            <View key={f} style={styles.point}>
              <Ionicons name="flag-outline" size={18} color={colors.danger} style={styles.pointIcon} />
              <Body style={styles.pointText}>{f}</Body>
            </View>
          ))}
        </Card>
      ) : null}

      {r.sources.length ? (
        <Card>
          <Pressable style={[styles.inline, { justifyContent: "space-between" }]} onPress={() => setShowSources((s) => !s)}>
            <Text style={styles.cardTitle}>Sources ({r.sources.length})</Text>
            <Ionicons name={showSources ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
          </Pressable>
          {showSources
            ? r.sources.map((s) => (
                <Pressable key={s.url} onPress={() => open(s.url)} style={styles.point}>
                  <Ionicons name="open-outline" size={16} color={colors.primary} style={styles.pointIcon} />
                  <Text style={styles.source}>{s.title}</Text>
                </Pressable>
              ))
            : null}
        </Card>
      ) : null}

      <View style={{ gap: space.sm }}>
        {user?.tier.doctorReports ? (
          <Button title="Share with my doctor" icon="share-outline" variant="secondary" onPress={shareWithDoctor} />
        ) : null}
        {isLink ? <Button title="Open original" icon="open-outline" variant="secondary" onPress={() => open(check.url)} /> : null}
        <Button title="Check something else" onPress={goHome} />
      </View>
      <Text style={styles.disclaimer}>Checked by AI against published evidence. General information, not medical advice.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  waiting: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.lg, backgroundColor: colors.bg },
  waitingText: { fontFamily: fonts.heading, fontSize: size.heading, color: colors.text, textAlign: "center" },
  inline: { flexDirection: "row", alignItems: "center", gap: space.sm },
  scoreCaption: { fontFamily: fonts.body, fontSize: size.small, color: colors.muted },
  cardTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  point: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  pointIcon: { marginTop: 3 },
  pointText: { flex: 1, fontSize: 16, lineHeight: 23 },
  claim: { paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  claimText: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22, color: colors.text },
  claimVerdict: { fontFamily: fonts.bodySemi, fontSize: size.small },
  source: { flex: 1, color: colors.primary, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  disclaimer: { fontFamily: fonts.body, fontSize: 13, color: colors.faint, textAlign: "center", marginTop: space.sm },
});
