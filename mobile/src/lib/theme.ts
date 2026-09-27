export const colors = {
  bg: "#F6F8FB",
  card: "#FFFFFF",
  text: "#14213D",
  muted: "#5C677D",
  border: "#DDE3EC",
  primary: "#2563EB",
  primaryText: "#FFFFFF",
  danger: "#B91C1C",
  dangerBg: "#FEE2E2",
  warnBg: "#FEF3C7",
  warnText: "#92400E",
  okBg: "#DCFCE7",
  okText: "#166534",
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = 16;

/** Large, readable type for a beginner-friendly app. */
export const font = {
  title: 30,
  heading: 22,
  body: 18,
  small: 15,
};

export const verdictStyle: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  accurate: { label: "Accurate", color: "#166534", bg: "#DCFCE7", emoji: "✅" },
  mostly_accurate: { label: "Mostly accurate", color: "#3F6212", bg: "#ECFCCB", emoji: "👍" },
  mixed: { label: "Mixed", color: "#92400E", bg: "#FEF3C7", emoji: "🤔" },
  misleading: { label: "Misleading", color: "#9A3412", bg: "#FFEDD5", emoji: "⚠️" },
  false: { label: "False", color: "#991B1B", bg: "#FEE2E2", emoji: "❌" },
  unverifiable: { label: "Can't be verified", color: "#374151", bg: "#F3F4F6", emoji: "❔" },
};

export const claimStyle: Record<string, { label: string; color: string }> = {
  supported: { label: "Backed by evidence", color: "#166534" },
  partly_supported: { label: "Partly true", color: "#3F6212" },
  unsupported: { label: "No good evidence", color: "#9A3412" },
  contradicted: { label: "Evidence says otherwise", color: "#991B1B" },
  unverifiable: { label: "Can't be checked", color: "#374151" },
};

export const relevanceStyle: Record<string, { label: string; color: string; bg: string }> = {
  helpful_for_you: { label: "Could help you", color: "#166534", bg: "#DCFCE7" },
  not_relevant: { label: "Not really relevant to you", color: "#374151", bg: "#F3F4F6" },
  use_caution: { label: "Be careful", color: "#92400E", bg: "#FEF3C7" },
  avoid: { label: "Not safe for you", color: "#991B1B", bg: "#FEE2E2" },
};
