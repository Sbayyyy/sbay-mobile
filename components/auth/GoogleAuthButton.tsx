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
import { GOOGLE_AUTH_ENABLED } from "@/services/config";

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
  const isComingSoon = !GOOGLE_AUTH_ENABLED;
  const isDisabled = disabled || loading || isComingSoon;
  const googleLabel =
    mode === "signIn"
      ? t("auth.google.signIn", { defaultValue: "Continue with Google" })
      : t("auth.google.signUp", { defaultValue: "Sign up with Google" });
  const comingSoonLabel = t("settings.common.comingSoon", { defaultValue: "Coming soon" });

  const handlePress = useCallback(async () => {
    if (isDisabled) return;
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
  }, [isDisabled, signIn, t]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={
          isComingSoon ? `${googleLabel}. ${comingSoonLabel}` : googleLabel
        }
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <FontAwesome
            name="google"
            size={18}
            color={isComingSoon ? theme.textMuted : theme.danger}
          />
        )}
        <View style={styles.labelGroup}>
          <Text style={[styles.label, isComingSoon && styles.labelDisabled]}>{googleLabel}</Text>
          {isComingSoon ? (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>{comingSoonLabel}</Text>
            </View>
          ) : null}
        </View>
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
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.sm,
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
    labelGroup: {
      alignItems: "center",
      gap: MarketplaceSpacing.xs,
      flexShrink: 1,
    },
    label: {
      fontSize: MarketplaceTypography.input,
      fontWeight: "800",
      color: theme.text,
      textAlign: "center",
    },
    labelDisabled: {
      color: theme.textMuted,
    },
    comingSoonBadge: {
      borderRadius: MarketplaceRadius.pill,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      paddingHorizontal: MarketplaceSpacing.sm,
      paddingVertical: 2,
    },
    comingSoonBadgeText: {
      fontSize: MarketplaceTypography.caption,
      fontWeight: "800",
      color: theme.textMuted,
      textTransform: "uppercase",
    },
    errorText: {
      fontSize: MarketplaceTypography.meta,
      color: theme.danger,
      textAlign: "center",
    },
  });
