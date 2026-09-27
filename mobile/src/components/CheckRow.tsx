import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, PLATFORM_NAMES, radius, size, space, verdictStyle } from "../lib/theme";
import type { CheckSummary } from "../lib/types";
import { ScoreRing } from "./ui";

function timeAgo(ms: number) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function CheckRow({ check, onPress }: { check: CheckSummary; onPress: () => void }) {
  const v = check.verdict ? verdictStyle[check.verdict] : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <View style={styles.left}>
        {check.status === "processing" ? (
          <ActivityIndicator color={colors.primary} />
        ) : check.status === "failed" || check.score === null ? (
          <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
        ) : (
          <ScoreRing score={check.score} color={v?.color ?? colors.muted} size={48} stroke={4} />
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.meta}>
          {(PLATFORM_NAMES[check.platform] ?? "Video").toUpperCase()} · {timeAgo(check.createdAt)}
        </Text>
        <Text style={[styles.verdict, { color: v?.color ?? (check.status === "failed" ? colors.danger : colors.muted) }]}>
          {v ? v.label : check.status === "failed" ? "Couldn't check" : "Checking…"}
        </Text>
        <Text numberOfLines={2} style={styles.summary}>
          {check.summary ?? check.error ?? check.url}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  left: { width: 52, alignItems: "center" },
  meta: { fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 1.6, color: colors.faint },
  verdict: { fontFamily: fonts.bodySemi, fontSize: size.body },
  summary: { fontFamily: fonts.body, fontSize: size.small, color: colors.muted, lineHeight: 20 },
});
