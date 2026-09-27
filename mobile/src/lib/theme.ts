// Sift brand system - see the brand book.

/** Brand palette. */
export const brand = {
  midnight: "#0B0F12", // trust, focus, depth
  teal: "#00D1B2", // clarity, health, progress
  sage: "#7ED3C6", // balance, wellbeing, growth
  sand: "#EDEBE6", // calm, neutrality, simplicity
  slate: "#A7B0B8", // support, clarity, science
};

export const colors = {
  bg: brand.midnight,
  surface: "#11181D",
  surfaceRaised: "#162027",
  border: "#1F2C33",
  text: brand.sand,
  muted: brand.slate,
  faint: "#6B7780",
  primary: brand.teal,
  onPrimary: brand.midnight,
  accent: brand.sage,
  danger: "#F07167",
  dangerBg: "rgba(240,113,103,0.12)",
  warn: "#F2C572",
  warnBg: "rgba(242,197,114,0.12)",
  tealBg: "rgba(0,209,178,0.10)",
};

/** Primary gradient (app / hero elements): Midnight -> Teal. */
export const primaryGradient = [brand.midnight, "#073B3A", brand.teal] as const;
/** Secondary gradient (accents / highlights): Sage -> Sand. */
export const secondaryGradient = ["#C9E7E1", "#E3E2C5"] as const;

export const fonts = {
  headingBold: "PlusJakartaSans_700Bold",
  heading: "PlusJakartaSans_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  light: "Inter_300Light",
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

/** Large, readable type for a beginner-friendly app. */
export const size = {
  display: 34,
  title: 28,
  heading: 20,
  body: 17,
  small: 14,
  eyebrow: 12,
};

type Tone = { label: string; color: string; bg: string; icon: string };

export const verdictStyle: Record<string, Tone> = {
  accurate: { label: "Accurate", color: brand.teal, bg: "rgba(0,209,178,0.14)", icon: "checkmark-circle" },
  mostly_accurate: { label: "Mostly accurate", color: brand.sage, bg: "rgba(126,211,198,0.14)", icon: "checkmark-circle-outline" },
  mixed: { label: "Partially true", color: "#F2C572", bg: "rgba(242,197,114,0.14)", icon: "remove-circle-outline" },
  misleading: { label: "Misleading", color: "#F29E6B", bg: "rgba(242,158,107,0.14)", icon: "alert-circle-outline" },
  false: { label: "False", color: "#F07167", bg: "rgba(240,113,103,0.14)", icon: "close-circle-outline" },
  unverifiable: { label: "Can't be verified", color: brand.slate, bg: "rgba(167,176,184,0.14)", icon: "help-circle-outline" },
};

export const claimStyle: Record<string, Tone> = {
  supported: { label: "Backed by evidence", color: brand.teal, bg: "", icon: "checkmark-circle" },
  partly_supported: { label: "Partly true", color: "#F2C572", bg: "", icon: "remove-circle" },
  unsupported: { label: "No good evidence", color: "#F29E6B", bg: "", icon: "alert-circle" },
  contradicted: { label: "Evidence says otherwise", color: "#F07167", bg: "", icon: "close-circle" },
  unverifiable: { label: "Can't be checked", color: brand.slate, bg: "", icon: "help-circle" },
};

export const relevanceStyle: Record<string, Tone> = {
  helpful_for_you: { label: "Could help you", color: brand.teal, bg: "rgba(0,209,178,0.14)", icon: "thumbs-up-outline" },
  not_relevant: { label: "Not really relevant to you", color: brand.slate, bg: "rgba(167,176,184,0.14)", icon: "ellipse-outline" },
  use_caution: { label: "Be careful", color: "#F2C572", bg: "rgba(242,197,114,0.14)", icon: "warning-outline" },
  avoid: { label: "Not safe for you", color: "#F07167", bg: "rgba(240,113,103,0.14)", icon: "hand-left-outline" },
};

export const PLATFORM_NAMES: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
  snapchat: "Snapchat",
  threads: "Threads",
  pinterest: "Pinterest",
  reddit: "Reddit",
  other: "Article",
  text: "Claim",
};
