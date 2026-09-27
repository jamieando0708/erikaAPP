export type TierId = "free" | "basic" | "plus" | "pro";

export interface Tier {
  id: TierId;
  name: string;
  priceUsdMonthly: number;
  /** Hard monthly cap. "Unlimited" tiers still have a fair-use cap to bound AI costs. */
  checksPerMonth: number;
  unlimited: boolean;
  personalAdvice: boolean;
  maxProfiles: number;
  doctorReports: boolean;
}

export const TIERS: Record<TierId, Tier> = {
  free: {
    id: "free",
    name: "Free trial",
    priceUsdMonthly: 0,
    checksPerMonth: 3,
    unlimited: false,
    personalAdvice: false,
    maxProfiles: 1,
    doctorReports: false,
  },
  basic: {
    id: "basic",
    name: "Basic",
    priceUsdMonthly: 10,
    checksPerMonth: 30,
    unlimited: false,
    personalAdvice: false,
    maxProfiles: 1,
    doctorReports: false,
  },
  plus: {
    id: "plus",
    name: "Plus",
    priceUsdMonthly: 20,
    checksPerMonth: 300,
    unlimited: true,
    personalAdvice: true,
    maxProfiles: 1,
    doctorReports: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsdMonthly: 40,
    checksPerMonth: 1000,
    unlimited: true,
    personalAdvice: true,
    maxProfiles: 4,
    doctorReports: true,
  },
};

/** Store product IDs (App Store / Google Play, via RevenueCat) -> tier. */
export const PRODUCT_TO_TIER: Record<string, TierId> = {
  sift_basic_monthly: "basic",
  sift_plus_monthly: "plus",
  sift_pro_monthly: "pro",
};

export function effectiveTier(tier: string, expiresAt: number | null, now = Date.now()): Tier {
  if (!(tier in TIERS) || tier === "free") return TIERS.free;
  if (expiresAt !== null && expiresAt < now) return TIERS.free;
  return TIERS[tier as TierId];
}

export function startOfMonthUtc(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}
