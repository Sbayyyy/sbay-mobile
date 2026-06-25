import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";

import {
  MarketplaceRadius,
  MarketplaceShadow,
  MarketplaceSpacing,
  MarketplaceTypography,
} from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/providers/AuthProvider";
import { GOOGLE_AUTH_CANCELLED_ERROR, loginWithGoogle } from "@/services/auth";

type GoogleAuthButtonProps = {
  mode: "signIn" | "signUp";
  disabled?: boolean;
};

export function GoogleAuthButton({ mode, disabled = false }: GoogleAuthButtonProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePress = useCallback(async () => {
    if (disabled || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle();
      await signIn(result.token, result.refreshToken ?? null);
    } catch (err) {
      if (err instanceof Error && err.message === GOOGLE_AUTH_CANCELLED_ERROR) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : t("auth.google.error", { defaultValue: "Unable to continue with Google." }),
      );
    } finally {
      setLoading(false);
    }
  }, [disabled, loading, signIn, t]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={
          mode === "signIn"
            ? t("auth.google.signIn", { defaultValue: "Continue with Google" })
            : t("auth.google.signUp", { defaultValue: "Sign up with Google" })
        }
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <FontAwesome name="google" size={18} color={theme.danger} />
        )}
        <Text style={styles.label}>
          {mode === "signIn"
            ? t("auth.google.signIn", { defaultValue: "Continue with Google" })
            : t("auth.google.signUp", { defaultValue: "Sign up with Google" })}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      gap: MarketplaceSpacing.sm,
    },
    button: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: MarketplaceSpacing.sm,
      borderRadius: MarketplaceRadius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    label: {
      fontSize: MarketplaceTypography.input,
      fontWeight: "800",
      color: theme.text,
    },
    errorText: {
      fontSize: MarketplaceTypography.meta,
      color: theme.danger,
      textAlign: "center",
    },
  });
