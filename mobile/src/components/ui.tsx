import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, radius, space } from "../lib/theme";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
}) {
  const bg = variant === "primary" ? colors.primary : variant === "danger" ? colors.dangerBg : colors.card;
  const fg = variant === "primary" ? colors.primaryText : variant === "danger" ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === "secondary" && { borderWidth: 2, borderColor: colors.primary },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[styles.chipText, selected && { color: colors.primaryText }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A free-text list: add items one at a time, tap to remove. */
export function ListEditor({
  label,
  hint,
  items,
  onChange,
  suggestions = [],
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  suggestions?: string[];
}) {
  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !items.some((i) => i.toLowerCase() === v.toLowerCase())) onChange([...items, v]);
  };
  const remaining = suggestions.filter((s) => !items.includes(s));
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.chips}>
        {items.map((i) => (
          <Pressable
            key={i}
            accessibilityLabel={`Remove ${i}`}
            onPress={() => onChange(items.filter((x) => x !== i))}
            style={[styles.chip, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[styles.chipText, { color: colors.primaryText }]}>{i} ✕</Text>
          </Pressable>
        ))}
        {remaining.map((s) => (
          <Pressable key={s} onPress={() => add(s)} style={styles.chip}>
            <Text style={styles.chipText}>+ {s}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        placeholder="Type and press enter to add"
        placeholderTextColor={colors.muted}
        style={styles.input}
        blurOnSubmit={false}
        onSubmitEditing={(e) => {
          add(e.nativeEvent.text);
          (e.target as unknown as { clear?: () => void }).clear?.();
        }}
        returnKeyType="done"
      />
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Text style={{ color: colors.danger, fontSize: font.body }}>{message}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.lg }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Body muted>{label}</Body> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: font.title, fontWeight: "800", color: colors.text },
  heading: { fontSize: font.heading, fontWeight: "700", color: colors.text },
  body: { fontSize: font.body, lineHeight: 26, color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    minHeight: 56,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  buttonText: { fontSize: font.body, fontWeight: "700" },
  label: { fontSize: font.body, fontWeight: "600", color: colors.text },
  hint: { fontSize: font.small, color: colors.muted },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: space.md,
    fontSize: font.body,
    backgroundColor: colors.card,
    color: colors.text,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: { fontSize: font.small, color: colors.text, fontWeight: "600" },
  error: { backgroundColor: colors.dangerBg, padding: space.md, borderRadius: 12 },
});
