// Mirrors the server's response shapes (server/src).

export type TierId = "free" | "basic" | "plus" | "pro";

export interface Tier {
  id: TierId;
  name: string;
  priceUsdMonthly: number;
  checksPerMonth: number;
  unlimited: boolean;
  personalAdvice: boolean;
  maxProfiles: number;
  doctorReports: boolean;
}

export interface Me {
  id: string;
  email: string;
  tier: Tier;
  tierExpiresAt: number | null;
  usage: { checksThisMonth: number; checksRemaining: number };
  healthConsent: boolean;
  profiles: Array<{ id: string; displayName: string }>;
}

export interface HealthProfile {
  displayName: string;
  age: number | null;
  sex: "female" | "male" | "intersex" | "prefer_not_to_say";
  heightCm: number | null;
  weightKg: number | null;
  pregnant: boolean;
  conditions: string[];
  medications: string[];
  allergies: string[];
  injuries: string[];
  fitnessLevel: "beginner" | "intermediate" | "advanced";
  goals: string[];
  notes: string;
}

export interface SavedProfile extends HealthProfile {
  id: string;
  updatedAt: number;
}

export interface Report {
  topic: string;
  overall_score: number;
  verdict: string;
  summary: string;
  claims: Array<{ claim: string; verdict: string; explanation: string; source_urls: string[] }>;
  useful_takeaways: string[];
  red_flags: string[];
  personal: { relevance: string; advice: string; cautions: string[] } | null;
  see_a_professional: boolean;
  urgent_safety_warning: string | null;
  sources: Array<{ url: string; title: string }>;
}

export interface CheckSummary {
  id: string;
  url: string;
  platform: string;
  status: "processing" | "done" | "failed";
  error: string | null;
  createdAt: number;
  profileId: string | null;
  score: number | null;
  verdict: string | null;
  summary: string | null;
}

export interface Check extends CheckSummary {
  report: Report | null;
}
