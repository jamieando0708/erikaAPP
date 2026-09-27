import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, setAuthToken } from "./api";
import { getItem, setItem } from "./storage";
import type { Me } from "./types";

const TOKEN_KEY = "factfit.token";

interface AuthState {
  ready: boolean;
  user: Me | null;
  signIn: (mode: "signup" | "login", email: string, password: string) => Promise<Me>;
  signOut: () => Promise<void>;
  refresh: () => Promise<Me | null>;
  setUser: (me: Me) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me | null>(null);

  const clear = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await setItem(TOKEN_KEY, null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
      return me;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await clear();
      return null;
    }
  }, [clear]);

  useEffect(() => {
    (async () => {
      const token = await getItem(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        await refresh();
      }
      setReady(true);
    })();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      setUser,
      refresh,
      signIn: async (mode, email, password) => {
        const res = mode === "signup" ? await api.signup(email, password) : await api.login(email, password);
        setAuthToken(res.token);
        await setItem(TOKEN_KEY, res.token);
        setUser(res.user);
        return res.user;
      },
      signOut: async () => {
        try {
          await api.logout();
        } catch {
          // Log out locally even if the server can't be reached.
        }
        await clear();
      },
    }),
    [ready, user, refresh, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
