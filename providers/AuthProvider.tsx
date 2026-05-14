import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";

import { clearStoredToken, getStoredToken, storeToken } from "@/services/auth";
import { setAuthToken, setUnauthorizedHandler } from "@/services/auth-session";
import { syncPushToken, unregisterPushToken } from "@/services/push-notifications";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  token: string | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [token, setToken] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    await unregisterPushToken();
    await clearStoredToken();
    setAuthToken(null);
    setToken(null);
    setStatus("unauthenticated");
    router.replace("/sign-in");
  }, [router]);

  const signIn = useCallback(async (nextToken: string) => {
    await storeToken(nextToken);
    setAuthToken(nextToken);
    setToken(nextToken);
    setStatus("authenticated");
    router.replace("/");
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      setStatus("loading");
      const stored = await getStoredToken();
      if (!stored) {
        if (!isMounted) return;
        setToken(null);
        setStatus("unauthenticated");
        return;
      }

      setAuthToken(stored);
      if (!isMounted) return;
      setToken(stored);
      setStatus("authenticated");
    };

    void hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(null);
    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    void syncPushToken();
  }, [status]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, token, signIn, signOut }),
    [status, token, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
