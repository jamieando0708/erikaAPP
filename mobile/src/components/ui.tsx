import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { colors, fonts, radius, size, space } from "../lib/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Screen({
  children,
  scroll = true,
  edges = ["bottom", "left", "right"],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Array<"top" | "bottom" | "left" | "right">;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
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

/** Small spaced-out capitals, as used across the brand ("YOUR CONTEXT"). */
export function Eyebrow({ children, color = colors.muted }: { children: ReactNode; color?: string }) {
  return <Text style={[styles.eyebrow, { color }]}>{children}</Text>;
}

export function Title({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Heading({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: TextStyle }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
}) {
  const fg =
    variant === "primary" ? colors.onPrimary : variant === "danger" ? colors.danger : variant === "ghost" ? colors.primary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && { backgroundColor: colors.primary },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
        variant === "danger" && { backgroundColor: colors.dangerBg },
        { opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  icon,
  style,
  ...props
}: TextInputProps & { label?: string; hint?: string; icon?: IconName }) {
  return (
    <View style={{ gap: space.xs }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        {icon ? <Ionicons name={icon} size={20} color={colors.muted} style={{ marginLeft: space.md }} /> : null}
        <TextInput
          placeholderTextColor={colors.faint}
          selectionColor={colors.primary}
          style={[styles.input, icon && { paddingLeft: space.sm }, style]}
          {...props}
        />
      </View>
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
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>{o.label}</Text>
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
            style={[styles.chip, styles.chipSelected]}
          >
            <Text style={[styles.chipText, { color: colors.onPrimary }]}>{i}  ✕</Text>
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
        placeholderTextColor={colors.faint}
        selectionColor={colors.primary}
        style={[styles.input, styles.inputBox]}
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

/** Icon in a thin teal ring, as in the brand's values and "Your context" rows. */
export function IconRing({ name, color = colors.primary, size: s = 44 }: { name: IconName; color?: string; size?: number }) {
  return (
    <View
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        borderWidth: 1.5,
        borderColor: color + "66",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={s * 0.45} color={color} />
    </View>
  );
}

export function Pill({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: color + "55" }]}>
      {icon ? <Ionicons name={icon} size={16} color={color} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Circular score out of 100. */
export function ScoreRing({ score, color, size: s = 96, stroke = 8 }: { score: number; color: string; size?: number; stroke?: number }) {
  const r = (s - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
      <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
        <Circle cx={s / 2} cy={s / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={s / 2}
          cy={s / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.max(0, Math.min(100, score))) / 100} ${c}`}
          transform={`rotate(-90 ${s / 2} ${s / 2})`}
        />
      </Svg>
      <Text style={{ fontFamily: fonts.headingBold, fontSize: s * 0.3, color: colors.text }}>{score}</Text>
    </View>
  );
}

export function Row({
  icon,
  title,
  subtitle,
  onPress,
  right,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      {icon ? <IconRing name={icon} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={colors.faint} /> : null)}
    </Pressable>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Text style={{ color: colors.danger, fontSize: size.body, fontFamily: fonts.body, flex: 1 }}>{message}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.lg, backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Body muted style={{ textAlign: "center" }}>{label}</Body> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, maxWidth: 640, width: "100%", alignSelf: "center" },
  eyebrow: { fontFamily: fonts.bodyMedium, fontSize: size.eyebrow, letterSpacing: 2.4, textTransform: "uppercase" },
  title: { fontFamily: fonts.headingBold, fontSize: size.title, lineHeight: size.title * 1.2, color: colors.text, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.heading, fontSize: size.heading, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: size.body, lineHeight: 25, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  buttonText: { fontFamily: fonts.bodySemi, fontSize: size.body },
  label: { fontFamily: fonts.bodyMedium, fontSize: size.body, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: size.small, color: colors.muted },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: space.md,
    fontSize: size.body,
    fontFamily: fonts.body,
    color: colors.text,
  },
  inputBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: size.small, color: colors.text },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillText: { fontFamily: fonts.bodySemi, fontSize: size.small },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: size.body, color: colors.text },
  rowSubtitle: { fontFamily: fonts.body, fontSize: size.small, color: colors.muted },
  error: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
    backgroundColor: colors.dangerBg,
    padding: space.md,
    borderRadius: radius.md,
  },
});
