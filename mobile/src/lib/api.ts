import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Check, CheckSummary, HealthProfile, Me, SavedProfile, Tier, TierId } from "./types";

/**
 * Where the FactFit server lives. Set EXPO_PUBLIC_API_URL for real builds.
 * In development we point at the computer running `expo start`, so a phone
 * on the same Wi-Fi can reach a local server.
 */
function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:4000`;
  return Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't connect. Check your internet and try again.", 0);
  }
  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const err = (isJson ? data : {}) as { error?: string; code?: string };
    throw new ApiError(err.error ?? "Something went wrong.", res.status, err.code);
  }
  return data as T;
}

export const CONSENT_VERSION = "2026-09-v1";

export const api = {
  signup: (email: string, password: string) =>
    request<{ token: string; user: Me }>("POST", "/auth/signup", { email, password }),
  login: (email: string, password: string) =>
    request<{ token: string; user: Me }>("POST", "/auth/login", { email, password }),
  logout: () => request<void>("POST", "/auth/logout"),
  me: () => request<Me>("GET", "/me"),
  giveConsent: () => request<Me>("POST", "/me/consent", { version: CONSENT_VERSION, accepted: true }),
  withdrawConsent: () => request<Me>("DELETE", "/me/consent"),
  exportData: () => request<unknown>("GET", "/me/export"),
  deleteAccount: () => request<void>("DELETE", "/me"),

  profiles: () => request<SavedProfile[]>("GET", "/profiles"),
  createProfile: (p: HealthProfile) => request<SavedProfile>("POST", "/profiles", p),
  updateProfile: (id: string, p: HealthProfile) => request<SavedProfile>("PUT", `/profiles/${id}`, p),
  deleteProfile: (id: string) => request<void>("DELETE", `/profiles/${id}`),

  plans: () => request<Tier[]>("GET", "/plans"),
  devActivate: (tier: TierId) => request<Me>("POST", "/billing/dev/activate", { tier }),

  startCheck: (shared: string, note?: string, profileId?: string) =>
    request<{ id: string }>("POST", "/checks", { shared, note: note || undefined, profileId }),
  checks: () => request<CheckSummary[]>("GET", "/checks"),
  check: (id: string) => request<Check>("GET", `/checks/${id}`),
  deleteCheck: (id: string) => request<void>("DELETE", `/checks/${id}`),
  doctorReport: (id: string) => request<string>("GET", `/checks/${id}/doctor-report`),
};
