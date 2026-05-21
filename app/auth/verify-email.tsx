import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useURL } from "expo-linking";

import { AppScreen } from "@/components/layout/AppScreen";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/providers/AuthProvider";
import { verifyEmail } from "@/services/auth";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{
    token?: string | string[];
    code?: string | string[];
    verificationToken?: string | string[];
    emailVerificationToken?: string | string[];
    email?: string | string[];
  }>();
  const currentUrl = useURL();
  const router = useRouter();
  const { signOut, status: authStatus } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let isMounted = true;
    const readParam = (value?: string | string[]) =>
      Array.isArray(value) ? value[0] : value;
    const readHashParam = (name: string) => {
      if (!currentUrl) return undefined;
      const hashIndex = currentUrl.indexOf("#");
      if (hashIndex === -1) return undefined;
      const hash = currentUrl.slice(hashIndex + 1);
      return new URLSearchParams(hash).get(name) ?? undefined;
    };

    const token =
      readParam(params.token) ??
      readParam(params.verificationToken) ??
      readParam(params.emailVerificationToken) ??
      readHashParam("token") ??
      readHashParam("verificationToken") ??
      readHashParam("emailVerificationToken");
    const code = readParam(params.code) ?? readHashParam("code");
    const email = readParam(params.email) ?? readHashParam("email");

    if (!token && !code) {
      setStatus("error");
      setMessage("This verification link is missing a token.");
      return;
    }

    verifyEmail({ token, code, email })
      .then(() => {
        if (!isMounted) return;
        setStatus("success");
        setMessage("Email verified. You can sign in now.");
        setTimeout(() => {
          if (authStatus === "authenticated") {
            void signOut().then(() => {
              router.replace({
                pathname: "/sign-in",
                params: { verified: "1" },
              });
            });
            return;
          }
          router.replace({
            pathname: "/sign-in",
            params: { verified: "1" },
          });
        }, 900);
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to verify this email.");
      });

    return () => {
      isMounted = false;
    };
  }, [
    authStatus,
    currentUrl,
    params.code,
    params.email,
    params.emailVerificationToken,
    params.token,
    params.verificationToken,
    router,
    signOut,
  ]);

  return (
    <AppScreen edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        {status === "loading" ? <ActivityIndicator color={theme.primary} /> : null}
        <Text style={styles.title}>
          {status === "success"
            ? "Email verified"
            : status === "error"
              ? "Verification failed"
              : "Verifying email"}
        </Text>
        <Text style={styles.message}>{message}</Text>
        {status !== "loading" ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              router.replace({
                pathname: "/sign-in",
                params: status === "success" ? { verified: "1" } : { verified: "0" },
              })
            }
          >
            <Text style={styles.buttonLabel}>Go to sign in</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
      backgroundColor: theme.background,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
    },
    message: {
      fontSize: 15,
      color: theme.textMuted,
      lineHeight: 21,
      textAlign: "center",
    },
    button: {
      marginTop: 8,
      borderRadius: 16,
      backgroundColor: theme.primary,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    buttonLabel: {
      color: theme.primaryForeground,
      fontSize: 15,
      fontWeight: "700",
    },
  });
