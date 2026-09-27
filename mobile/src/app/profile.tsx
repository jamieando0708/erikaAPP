import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { Body, Button, Card, Chips, ErrorText, Field, Heading, ListEditor, Loading, Screen } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors, font, space } from "../lib/theme";
import type { HealthProfile } from "../lib/types";

const EMPTY: HealthProfile = {
  displayName: "Me",
  age: null,
  sex: "prefer_not_to_say",
  heightCm: null,
  weightKg: null,
  pregnant: false,
  conditions: [],
  medications: [],
  allergies: [],
  injuries: [],
  fitnessLevel: "beginner",
  goals: [],
  notes: "",
};

const toNumber = (s: string) => {
  const n = Number(s.replace(",", "."));
  return s.trim() && Number.isFinite(n) ? n : null;
};

/** Create (no id) or edit (?id=...) a health profile. */
export default function ProfileScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<HealthProfile | null>(id ? null : { ...EMPTY, displayName: name ?? "Me" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .profiles()
      .then((all) => {
        const found = all.find((p) => p.id === id);
        if (found) {
          const { id: _id, updatedAt: _u, ...data } = found;
          setProfile(data);
        } else setError("Profile not found.");
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (!profile) return error ? <ErrorText message={error} /> : <Loading />;

  const set = <K extends keyof HealthProfile>(key: K, value: HealthProfile[K]) =>
    setProfile((p) => (p ? { ...p, [key]: value } : p));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (id) await api.updateProfile(id, profile);
      else await api.createProfile(profile);
      await refresh();
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Body muted>Everything is optional. Fill in what you're comfortable with - more detail means better advice.</Body>

      <Card>
        <Heading>About you</Heading>
        <Field label="Profile name" hint="e.g. Me, Mum, Sam" value={profile.displayName} onChangeText={(v) => set("displayName", v)} />
        <Field
          label="Age"
          keyboardType="number-pad"
          value={profile.age?.toString() ?? ""}
          onChangeText={(v) => set("age", toNumber(v))}
        />
        <Text style={labelStyle}>Sex</Text>
        <Chips
          value={profile.sex}
          onChange={(v) => set("sex", v)}
          options={[
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
            { value: "intersex", label: "Intersex" },
            { value: "prefer_not_to_say", label: "Prefer not to say" },
          ]}
        />
        {profile.sex === "female" || profile.sex === "intersex" ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Body>Pregnant or breastfeeding</Body>
            <Switch value={profile.pregnant} onValueChange={(v) => set("pregnant", v)} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Height (cm)"
              keyboardType="decimal-pad"
              value={profile.heightCm?.toString() ?? ""}
              onChangeText={(v) => set("heightCm", toNumber(v))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Weight (kg)"
              keyboardType="decimal-pad"
              value={profile.weightKg?.toString() ?? ""}
              onChangeText={(v) => set("weightKg", toNumber(v))}
            />
          </View>
        </View>
      </Card>

      <Card>
        <Heading>Your health</Heading>
        <ListEditor
          label="Health conditions"
          items={profile.conditions}
          onChange={(v) => set("conditions", v)}
          suggestions={["High blood pressure", "Type 2 diabetes", "Asthma", "Heart condition", "Anxiety", "Depression"]}
        />
        <ListEditor
          label="Medications & supplements"
          hint="Include dose if you know it."
          items={profile.medications}
          onChange={(v) => set("medications", v)}
        />
        <ListEditor
          label="Allergies"
          items={profile.allergies}
          onChange={(v) => set("allergies", v)}
          suggestions={["Nuts", "Dairy", "Gluten", "Shellfish"]}
        />
        <ListEditor
          label="Injuries or pain"
          items={profile.injuries}
          onChange={(v) => set("injuries", v)}
          suggestions={["Lower back", "Knee", "Shoulder"]}
        />
      </Card>

      <Card>
        <Heading>Fitness</Heading>
        <Text style={labelStyle}>Fitness level</Text>
        <Chips
          value={profile.fitnessLevel}
          onChange={(v) => set("fitnessLevel", v)}
          options={[
            { value: "beginner", label: "Just starting" },
            { value: "intermediate", label: "Fairly active" },
            { value: "advanced", label: "Very active" },
          ]}
        />
        <ListEditor
          label="Goals"
          items={profile.goals}
          onChange={(v) => set("goals", v)}
          suggestions={["Lose weight", "Build muscle", "More energy", "Sleep better", "Run further", "Eat healthier"]}
        />
        <Field
          label="Anything else?"
          value={profile.notes}
          onChangeText={(v) => set("notes", v)}
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />
      </Card>

      <ErrorText message={error} />
      <Button title="Save" onPress={save} loading={busy} />
    </Screen>
  );
}

const labelStyle = { fontSize: font.body, fontWeight: "600" as const, color: colors.text };
