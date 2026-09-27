import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Body, Button, Card, ErrorText, Heading, Loading, Screen, Title } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { realBillingEnabled, restorePurchases, subscribe } from "../lib/billing";
import { colors, font, space } from "../lib/theme";
import type { Tier } from "../lib/types";

function features(t: Tier): string[] {
  return [
    t.unlimited ? "Unlimited video checks" : `${t.checksPerMonth} video checks a month`,
    "Score, true/false claims and sources",
    ...(t.personalAdvice ? ["Advice that fits your own health profile"] : []),
    ...(t.maxProfiles > 1 ? [`Family: up to ${t.maxProfiles} people`] : []),
    ...(t.doctorReports ? ["Reports to share with your doctor"] : []),
  ];
}

export default function Plans() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [plans, setPlans] = useState<Tier[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.plans().then(setPlans).catch((e) => setError((e as Error).message));
  }, []);

  if (!plans || !user) return error ? <ErrorText message={error} /> : <Loading />;

  const choose = async (tier: Tier) => {
    setBusy(tier.id);
    setError(null);
    try {
      await subscribe(user.id, tier.id as Exclude<Tier["id"], "free">);
      const me = await refresh();
      if (me?.tier.personalAdvice && !me.healthConsent) router.replace("/consent");
      else router.back();
    } catch (e) {
      const err = e as { userCancelled?: boolean; message: string };
      if (!err.userCancelled) setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Title>Pick your plan</Title>
      <Body muted>Monthly. Cancel any time.</Body>
      {!realBillingEnabled ? (
        <Card style={{ backgroundColor: colors.warnBg, borderColor: "#FDE68A" }}>
          <Body style={{ fontSize: font.small }}>Test mode: choosing a plan unlocks it for free. No payment is taken.</Body>
        </Card>
      ) : null}
      <ErrorText message={error} />
      {plans.map((t) => {
        const current = user.tier.id === t.id;
        const popular = t.id === "plus";
        return (
          <Card key={t.id} style={popular ? { borderColor: colors.primary, borderWidth: 2 } : undefined}>
            {popular ? <Text style={{ color: colors.primary, fontWeight: "800" }}>MOST POPULAR</Text> : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Heading>{t.name}</Heading>
              <Text style={{ fontSize: font.heading, fontWeight: "800", color: colors.text }}>
                ${t.priceUsdMonthly}
                <Text style={{ fontSize: font.small, color: colors.muted }}>/month</Text>
              </Text>
            </View>
            <View style={{ gap: space.xs }}>
              {features(t).map((f) => (
                <Body key={f}>✓ {f}</Body>
              ))}
            </View>
            <Button
              title={current ? "Your current plan" : `Choose ${t.name}`}
              variant={popular ? "primary" : "secondary"}
              disabled={current}
              loading={busy === t.id}
              onPress={() => choose(t)}
            />
          </Card>
        );
      })}
      {realBillingEnabled ? (
        <Button title="Restore purchases" variant="secondary" onPress={() => restorePurchases(user.id).then(refresh)} />
      ) : null}
      <Body muted style={{ fontSize: font.small }}>
        "Unlimited" plans have a fair-use limit of {plans.find((p) => p.id === "plus")?.checksPerMonth} checks a month
        (Plus) and {plans.find((p) => p.id === "pro")?.checksPerMonth} (Pro).
      </Body>
    </Screen>
  );
}
