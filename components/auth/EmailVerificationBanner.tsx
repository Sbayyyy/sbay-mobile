import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { requestEmailVerification } from "@/services/auth";

type EmailVerificationBannerProps = {
  onSent?: () => void;
};

export function EmailVerificationBanner({ onSent }: EmailVerificationBannerProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      await requestEmailVerification();
      setMessage(t("emailVerification.sent", { defaultValue: "Verification email sent. Open the link in your inbox to finish." }));
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("emailVerification.sendError", { defaultValue: "Unable to send verification email." }));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="mail-unread-outline" size={20} color={theme.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t("emailVerification.title", { defaultValue: "Verify your email" })}</Text>
        <Text style={styles.body}>
          {t("emailVerification.body", { defaultValue: "Verify your email to create listings and message sellers." })}
        </Text>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.button, sending && styles.buttonDisabled]}
        onPress={handleSend}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color={theme.primaryForeground} />
        ) : (
          <Text style={styles.buttonLabel}>{t("emailVerification.send", { defaultValue: "Send" })}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      padding: 14,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryMuted,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },
    body: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 18,
    },
    success: {
      fontSize: 12,
      color: theme.success,
    },
    error: {
      fontSize: 12,
      color: theme.danger,
    },
    button: {
      minWidth: 68,
      minHeight: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonLabel: {
      color: theme.primaryForeground,
      fontSize: 13,
      fontWeight: "700",
    },
  });
