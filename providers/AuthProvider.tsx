import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, AppState } from "react-native";
import { useRouter } from "expo-router";

import { clearStoredToken, getStoredToken, refreshStoredToken, revokeStoredRefreshToken, storeToken } from "@/services/auth";
import { setAuthToken, setTokenRefreshHandler, setUnauthorizedHandler } from "@/services/auth-session";
import { syncPushToken, unregisterPushToken } from "@/services/push-notifications";
import { ErrorReporter } from "@/services/error-reporter";

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
  const signingOutRef = useRef(false);

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      if (token) {
        await unregisterPushToken().catch(() => {});
      }
      await revokeStoredRefreshToken().catch(() => {});
      await clearStoredToken();
      setAuthToken(null);
      setToken(null);
      setStatus("unauthenticated");
      router.replace("/sign-in");
    } catch (error) {
      ErrorReporter.captureException(error, { context: "signOut" });
      Alert.alert(
        "Sign out failed",
        "We could not remove your saved session from this device. Please try again.",
      );
    } finally {
      signingOutRef.current = false;
    }
  }, [router, token]);

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
    setTokenRefreshHandler(async () => {
      const result = await refreshStoredToken();
      if (result.status === "refreshed") {
        setToken(result.token);
        setStatus("authenticated");
        return result;
      }
      if (result.status === "unavailable" && token) {
        setStatus("authenticated");
      }
      return result;
    });
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => {
      setTokenRefreshHandler(null);
      setUnauthorizedHandler(null);
    };
  }, [signOut, token]);

  useEffect(() => {
    if (status === "unauthenticated") {
      ErrorReporter.setUser(null);
      return;
    }
    if (status !== "authenticated") return;
    void syncPushToken().catch((error) => {
      ErrorReporter.captureException(error, { context: "syncPushToken" });
    });
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return undefined;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void syncPushToken({ requestPermissions: false }).catch((error) => {
        ErrorReporter.captureException(error, { context: "syncPushToken on app active" });
      });
    });

    return () => {
      subscription.remove();
    };
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
