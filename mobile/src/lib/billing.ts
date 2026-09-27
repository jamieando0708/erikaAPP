import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { api } from "./api";
import type { TierId } from "./types";

/**
 * Subscriptions sold inside an iPhone/Android app must go through Apple's and
 * Google's own billing. RevenueCat handles both stores with one integration.
 *
 * Until RevenueCat keys are added, the app runs in "dev billing" mode: choosing
 * a plan instantly unlocks it on the dev server without charging anything.
 */
const RC_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

export const realBillingEnabled = Boolean(RC_KEY);

/** Offering package identifiers configured in the RevenueCat dashboard. */
const PACKAGE_FOR_TIER: Record<Exclude<TierId, "free">, string> = {
  basic: "basic_monthly",
  plus: "plus_monthly",
  pro: "pro_monthly",
};

let configuredFor: string | null = null;

function ensureConfigured(userId: string) {
  if (!RC_KEY || configuredFor === userId) return;
  // Using our user id as the RevenueCat app_user_id lets the webhook find the account.
  Purchases.configure({ apiKey: RC_KEY, appUserID: userId });
  configuredFor = userId;
}

export async function subscribe(userId: string, tier: Exclude<TierId, "free">): Promise<void> {
  if (!RC_KEY) {
    await api.devActivate(tier);
    return;
  }
  ensureConfigured(userId);
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages.find((p) => p.identifier === PACKAGE_FOR_TIER[tier]);
  if (!pkg) throw new Error("This plan isn't available right now. Please try again later.");
  await Purchases.purchasePackage(pkg);
  // The server is updated by RevenueCat's webhook; the caller refreshes the account.
}

export async function restorePurchases(userId: string): Promise<void> {
  if (!RC_KEY) return;
  ensureConfigured(userId);
  await Purchases.restorePurchases();
}
