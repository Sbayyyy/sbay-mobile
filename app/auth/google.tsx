import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import {
  MarketplaceRadius,
  MarketplaceSpacing,
  MarketplaceTypography,
} from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/providers/AuthProvider";
import { completeGoogleAuthFromParams } from "@/services/auth";

export default function GoogleAuthCallbackScreen() {
  const rawParams = useLocalSearchParams<Record<string, string | string[]>>();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const paramsKey = JSON.stringify(rawParams);
  const params = useMemo(
    () => JSON.parse(paramsKey) as Record<string, string | string[] | undefined>,
    [paramsKey],
  );

  useEffect(() => {
    let active = true;
    completeGoogleAuthFromParams(params)
      .then((result) => {
        if (!active) return;
        return signIn(result.token, result.refreshToken ?? null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : t("auth.google.error", { defaultValue: "Unable to continue with Google." }),
        );
      });
    return () => {
      active = false;
    };
  }, [params, signIn, t]);

  return (
    <AppScreen>
      <View style={styles.container}>
        {error ? (
          <>
            <Text style={styles.title}>
              {t("auth.google.errorTitle", { defaultValue: "Google sign-in failed" })}
            </Text>
            <Text style={styles.subtitle}>{error}</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.replace("/sign-in")}>
              <Text style={styles.buttonLabel}>
                {t("auth.signIn.title", { defaultValue: "Sign in" })}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.subtitle}>
              {t("auth.google.completing", { defaultValue: "Completing Google sign-in..." })}
            </Text>
          </>
        )}
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
      padding: MarketplaceSpacing.xxl,
      gap: MarketplaceSpacing.md,
      backgroundColor: theme.background,
    },
    title: {
      fontSize: MarketplaceTypography.title,
      fontWeight: "800",
      color: theme.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: MarketplaceTypography.body,
      color: theme.textMuted,
      textAlign: "center",
      lineHeight: 21,
    },
    button: {
      marginTop: MarketplaceSpacing.sm,
      borderRadius: MarketplaceRadius.lg,
      backgroundColor: theme.primary,
      paddingHorizontal: MarketplaceSpacing.xl,
      paddingVertical: MarketplaceSpacing.md,
    },
    buttonLabel: {
      color: theme.primaryForeground,
      fontWeight: "800",
    },
  });
