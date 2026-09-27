import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { Body, Button, Card, Chips, Eyebrow, Row, Screen, Title } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, space } from "../../lib/theme";
import type { SavedProfile } from "../../lib/types";

const FITNESS = { beginner: "Just starting", intermediate: "Fairly active", advanced: "Very active" };
const list = (items: string[], empty = "None added") => (items.length ? items.join(", ") : empty);

/** "Your context": the health profile Sift uses to personalise results. */
export default function You() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [profiles, setProfiles] = useState<SavedProfile[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      api.profiles().then(setProfiles).catch(() => setProfiles([]));
    }, [refresh]),
  );

  if (!user) return null;
  const profile = profiles?.find((p) => p.id === selected) ?? profiles?.[0] ?? null;

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={{ gap: space.xs, paddingTop: space.md }}>
        <Eyebrow>Profile</Eyebrow>
        <Title>Your context</Title>
        <Body muted>Because your health isn't one-size-fits-all.</Body>
      </View>

      {!user.healthConsent ? (
        <Card>
          <Body>Tell Sift about your health and every result will say what it means for you.</Body>
          <Button title="Add my context" onPress={() => router.push("/consent")} />
        </Card>
      ) : profiles && profiles.length === 0 ? (
        <Card>
          <Body>You haven't filled in your context yet.</Body>
          <Button title="Add my context" onPress={() => router.push("/profile")} />
        </Card>
      ) : profile ? (
        <>
          {profiles!.length > 1 ? (
            <Chips
              options={profiles!.map((p) => ({ value: p.id, label: p.displayName }))}
              value={profile.id}
              onChange={setSelected}
            />
          ) : null}
          <Card style={{ gap: 0 }}>
            <Row
              icon="person-outline"
              title={profile.displayName}
              subtitle={[profile.age ? `${profile.age} years` : null, profile.pregnant ? "Pregnant / breastfeeding" : null]
                .filter(Boolean)
                .join(" · ") || "Basic details"}
            />
            <Row icon="pulse-outline" title="Conditions" subtitle={list(profile.conditions)} />
            <Row icon="medkit-outline" title="Medications" subtitle={list(profile.medications)} />
            <Row icon="leaf-outline" title="Allergies" subtitle={list(profile.allergies)} />
            <Row icon="bandage-outline" title="Injuries" subtitle={list(profile.injuries)} />
            <Row icon="barbell-outline" title="Fitness" subtitle={FITNESS[profile.fitnessLevel]} />
            <Row icon="flag-outline" title="Goals" subtitle={list(profile.goals, "No goals set")} />
          </Card>
          <Button
            title="Edit context"
            variant="secondary"
            icon="create-outline"
            onPress={() => router.push({ pathname: "/profile", params: { id: profile.id } })}
          />
          {profiles!.length < user.tier.maxProfiles ? (
            <Button
              title="Add a family member"
              variant="ghost"
              icon="add"
              onPress={() => router.push({ pathname: "/profile", params: { name: "Family member" } })}
            />
          ) : null}
          {!user.tier.personalAdvice ? (
            <Body muted>Your context is saved. Personal advice comes with the Plus or Pro plan.</Body>
          ) : null}
        </>
      ) : null}

      <Eyebrow>Account</Eyebrow>
      <Card style={{ gap: 0 }}>
        <Row
          icon="sparkles-outline"
          title={`${user.tier.name} plan`}
          subtitle={`${user.usage.checksRemaining} checks left this month`}
          onPress={() => router.push("/plans")}
        />
        <Row icon="shield-checkmark-outline" title="Privacy & account" subtitle={user.email} onPress={() => router.push("/settings")} />
      </Card>
      <View style={{ height: space.lg, backgroundColor: colors.bg }} />
    </Screen>
  );
}
